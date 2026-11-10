import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  fakeProvider,
  selectPaymentProvider,
  stripeProvider,
  verifyPaymongoSignature,
  verifyStripeSignature,
} from "./provider";

function signature(timestamp: string, body: string, secret: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

describe("fake provider", () => {
  it("creates a deterministic checkout and reads its event JSON", async () => {
    const provider = fakeProvider();
    const checkout = await provider.createCheckout({
      taskId: "task_1",
      paymentId: "payment_1",
      amountCents: 45000,
      currency: "PHP",
      description: "Pick up groceries",
      successUrl: "https://example.test/success",
      cancelUrl: "https://example.test/cancel",
    });

    expect(checkout).toMatchObject({ provider: "fake", reference: "fake_cs_payment_1" });

    const event = await provider.parseWebhook(
      new Headers(),
      JSON.stringify({ id: "evt_1", type: "succeeded", reference: "fake_cs_payment_1" }),
    );
    expect(event).toEqual({
      id: "evt_1",
      type: "succeeded",
      reference: "fake_cs_payment_1",
      amountCents: null,
    });
  });

  it("rejects malformed events", async () => {
    const provider = fakeProvider();
    expect(await provider.parseWebhook(new Headers(), "{}")).toBeNull();
    expect(await provider.parseWebhook(new Headers(), "not-json")).toBeNull();
  });
});

describe("provider selection", () => {
  it("uses the fake provider for local development and tests", () => {
    expect(selectPaymentProvider({}).name).toBe("fake");
    expect(selectPaymentProvider({ PAYMENT_PROVIDER: "paymongo" }).name).toBe("fake");
    expect(selectPaymentProvider({ PAYMENT_PROVIDER: "stripe" }).name).toBe("fake");
    expect(
      selectPaymentProvider({
        PAYMENT_PROVIDER: "paymongo",
        PAYMONGO_SECRET_KEY: "sk_test",
        PAYMONGO_WEBHOOK_SECRET: "whsec",
      }).name,
    ).toBe("paymongo");
    expect(
      selectPaymentProvider({
        PAYMENT_PROVIDER: "stripe",
        STRIPE_SECRET_KEY: "sk_test",
        STRIPE_WEBHOOK_SECRET: "whsec",
      }).name,
    ).toBe("stripe");
  });

  it("refuses the unsigned fake provider in production by default", () => {
    expect(selectPaymentProvider({ NODE_ENV: "production" }).name).toBe("disabled");
    expect(
      selectPaymentProvider({
        NODE_ENV: "production",
        ALLOW_FAKE_PAYMENTS: "1",
      }).name,
    ).toBe("fake");
  });
});

describe("PayMongo webhook signatures", () => {
  const secret = "whsec_test";
  const body = JSON.stringify({ data: { id: "evt_1" } });
  const timestamp = "1761473000";
  const digest = signature(timestamp, body, secret);

  it("accepts a matching test or live signature", () => {
    expect(
      verifyPaymongoSignature(`t=${timestamp},te=${digest},li=deadbeef`, body, secret),
    ).toBe(true);
    expect(
      verifyPaymongoSignature(`t=${timestamp},te=deadbeef,li=${digest}`, body, secret),
    ).toBe(true);
  });

  it("rejects a wrong signature, missing timestamp, or tampered body", () => {
    expect(
      verifyPaymongoSignature(`t=${timestamp},te=deadbeef,li=deadbeef`, body, secret),
    ).toBe(false);
    expect(verifyPaymongoSignature(`te=${digest}`, body, secret)).toBe(false);
    expect(
      verifyPaymongoSignature(
        `t=${timestamp},te=${digest}`,
        JSON.stringify({ data: { id: "evt_2" } }),
        secret,
      ),
    ).toBe(false);
  });
});

describe("Stripe webhook signatures", () => {
  const secret = "whsec_test_stripe";
  const body = JSON.stringify({ id: "evt_stripe_1" });
  const timestamp = "1761474000";
  const digest = signature(timestamp, body, secret);

  it("accepts a matching v1 signature", () => {
    expect(verifyStripeSignature(`t=${timestamp},v1=${digest}`, body, secret)).toBe(true);
    expect(
      verifyStripeSignature(`t=${timestamp},v1=bad_sig,v1=${digest}`, body, secret),
    ).toBe(true);
  });

  it("rejects invalid, missing, or tampered signatures", () => {
    expect(verifyStripeSignature(`t=${timestamp},v1=deadbeef`, body, secret)).toBe(false);
    expect(verifyStripeSignature(`v1=${digest}`, body, secret)).toBe(false);
    expect(
      verifyStripeSignature(
        `t=${timestamp},v1=${digest}`,
        JSON.stringify({ id: "tampered" }),
        secret,
      ),
    ).toBe(false);
  });
});

describe("Stripe provider", () => {
  const secretKey = "sk_test_123";
  const webhookSecret = "whsec_test_123";

  it("creates checkout session with correct parameters", async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      id: "cs_test_session_123",
      url: "https://checkout.stripe.com/c/pay/cs_test_session_123",
    });

    const mockStripe = {
      checkout: {
        sessions: {
          create: mockCreate,
        },
      },
    } as any;

    const provider = stripeProvider({
      secretKey,
      webhookSecret,
      stripeClient: mockStripe,
    });

    const checkout = await provider.createCheckout({
      taskId: "task_1",
      paymentId: "payment_1",
      amountCents: 50000,
      currency: "PHP",
      description: "Repair wooden gate",
      successUrl: "https://taskhive.ph/success",
      cancelUrl: "https://taskhive.ph/cancel",
    });

    expect(checkout).toEqual({
      provider: "stripe",
      reference: "cs_test_session_123",
      url: "https://checkout.stripe.com/c/pay/cs_test_session_123",
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        client_reference_id: "payment_1",
        metadata: { taskId: "task_1", paymentId: "payment_1" },
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({
              currency: "php",
              unit_amount: 50000,
            }),
          }),
        ],
      }),
    );
  });

  it("parses successful checkout.session.completed webhook", async () => {
    const mockConstructEvent = vi.fn().mockReturnValue({
      id: "evt_completed_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_session_123",
          amount_total: 50000,
        },
      },
    });

    const mockStripe = {
      webhooks: {
        constructEvent: mockConstructEvent,
      },
    } as any;

    const provider = stripeProvider({
      secretKey,
      webhookSecret,
      stripeClient: mockStripe,
    });

    const headers = new Headers({ "stripe-signature": "t=123,v1=test" });
    const event = await provider.parseWebhook(headers, '{"type":"checkout.session.completed"}');

    expect(event).toEqual({
      id: "evt_completed_1",
      type: "succeeded",
      reference: "cs_test_session_123",
      amountCents: 50000,
    });
  });

  it("parses failed payment webhook", async () => {
    const mockConstructEvent = vi.fn().mockReturnValue({
      id: "evt_failed_1",
      type: "checkout.session.async_payment_failed",
      data: {
        object: {
          id: "cs_test_session_123",
          amount_total: 50000,
        },
      },
    });

    const mockStripe = {
      webhooks: {
        constructEvent: mockConstructEvent,
      },
    } as any;

    const provider = stripeProvider({
      secretKey,
      webhookSecret,
      stripeClient: mockStripe,
    });

    const headers = new Headers({ "stripe-signature": "t=123,v1=test" });
    const event = await provider.parseWebhook(headers, "{}");

    expect(event).toEqual({
      id: "evt_failed_1",
      type: "failed",
      reference: "cs_test_session_123",
      amountCents: 50000,
    });
  });

  it("parses refunded charge webhook", async () => {
    const mockConstructEvent = vi.fn().mockReturnValue({
      id: "evt_refund_1",
      type: "charge.refunded",
      data: {
        object: {
          id: "ch_123",
          payment_intent: "pi_123",
          amount_refunded: 50000,
          metadata: { checkoutSessionId: "cs_test_session_123" },
        },
      },
    });

    const mockStripe = {
      webhooks: {
        constructEvent: mockConstructEvent,
      },
    } as any;

    const provider = stripeProvider({
      secretKey,
      webhookSecret,
      stripeClient: mockStripe,
    });

    const headers = new Headers({ "stripe-signature": "t=123,v1=test" });
    const event = await provider.parseWebhook(headers, "{}");

    expect(event).toEqual({
      id: "evt_refund_1",
      type: "refunded",
      reference: "cs_test_session_123",
      amountCents: 50000,
    });
  });

  it("returns null on signature error or unhandled event", async () => {
    const mockConstructEvent = vi.fn().mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const mockStripe = {
      webhooks: {
        constructEvent: mockConstructEvent,
      },
    } as any;

    const provider = stripeProvider({
      secretKey,
      webhookSecret,
      stripeClient: mockStripe,
    });

    const headers = new Headers({ "stripe-signature": "t=123,v1=bad" });
    expect(await provider.parseWebhook(headers, "{}")).toBeNull();
    expect(await provider.parseWebhook(new Headers(), "{}")).toBeNull();
  });
});
