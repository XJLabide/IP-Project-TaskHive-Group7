import type Stripe from "stripe";
import { createHmac, createSign, generateKeyPairSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  fakeProvider,
  mayaProvider,
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


describe("Maya sandbox provider", () => {
  it("creates Maya hosted checkout and returns its redirect URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ checkoutId: "maya_checkout_1", redirectUrl: "https://payments-web-sandbox.paymaya.com/checkout/1" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const provider = mayaProvider({ publicApiKey: "pk-test", mode: "sandbox" });
    const result = await provider.createCheckout({
      taskId: "task_1", paymentId: "payment_1", amountCents: 12345, currency: "PHP",
      description: "Test task", successUrl: "https://taskhive.test/checkout?payment=success",
      cancelUrl: "https://taskhive.test/checkout?payment=cancelled",
    });
    expect(result).toEqual({ provider: "maya", reference: "maya_checkout_1", url: "https://payments-web-sandbox.paymaya.com/checkout/1" });
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(request.method).toBe("POST");
    expect(JSON.parse(String(request.body))).toMatchObject({ totalAmount: { value: 123.45, currency: "PHP" }, requestReferenceNumber: "payment_1" });
  });

  it("accepts a fresh Maya RSA webhook and maps successful payment", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const payload = { id: "maya_payment_1", status: "PAYMENT_SUCCESS", isPaid: true, amount: 123.45, currency: "PHP", updatedAt: new Date().toISOString() };
    const flattened = Object.entries(payload).map(([key, value]) => `${key}=${value}`).sort().join("&");
    const nonce = "maya_nonce_1";
    const signer = createSign("RSA-SHA256");
    signer.update(`${flattened}&nonce=${nonce}`);
    signer.end();
    const signature = signer.sign(privateKey).toString("hex");
    const provider = mayaProvider({ publicApiKey: "pk-test", mode: "sandbox", webhookPublicKeys: [publicKey.export({ type: "spki", format: "pem" }).toString(), publicKey.export({ type: "spki", format: "pem" }).toString()] });
    const event = await provider.parseWebhook(new Headers({ "x-maya-webhook-timestamp": String(Date.now()), "x-maya-webhook-signature": `nonce=${nonce},v1=${signature}` }), JSON.stringify(payload));
    expect(event).toMatchObject({ id: `maya_payment_1:PAYMENT_SUCCESS:${payload.updatedAt}`, type: "succeeded", reference: "maya_payment_1", amountCents: 12345 });
    const stale = await provider.parseWebhook(new Headers({ "x-maya-webhook-timestamp": String(Date.now() - 6 * 60 * 1000), "x-maya-webhook-signature": `nonce=${nonce},v1=${signature}` }), JSON.stringify(payload));
    expect(stale).toBeNull();
    const tampered = await provider.parseWebhook(new Headers({ "x-maya-webhook-timestamp": String(Date.now()), "x-maya-webhook-signature": `nonce=${nonce},v1=${signature}` }), JSON.stringify({ ...payload, isPaid: false }));
    expect(tampered).toBeNull();
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

  it("selects Maya only for explicitly enabled sandbox outside production", () => {
    const sandbox = { PAYMENT_PROVIDER: "maya", MAYA_MODE: "sandbox", MAYA_PUBLIC_API_KEY: "pk-test", MAYA_WEBHOOK_PUBLIC_KEY_1: "key-1", MAYA_WEBHOOK_PUBLIC_KEY_2: "key-2" };
    expect(selectPaymentProvider(sandbox).name).toBe("maya");
    expect(selectPaymentProvider({ ...sandbox, VERCEL_ENV: "preview" }).name).toBe("maya");
    expect(selectPaymentProvider({ ...sandbox, VERCEL_ENV: "production" }).name).toBe("disabled");
    expect(selectPaymentProvider({ ...sandbox, NODE_ENV: "production" }).name).toBe("disabled");
  });

  it("refuses the unsigned fake provider in production even if explicitly enabled", () => {
    expect(selectPaymentProvider({ NODE_ENV: "production" }).name).toBe("disabled");
    expect(
      selectPaymentProvider({
        NODE_ENV: "production",
        ALLOW_FAKE_PAYMENTS: "1",
      }).name,
    ).toBe("disabled");
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
    } as unknown as Stripe;

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
          payment_status: "paid",
          amount_total: 50000,
        },
      },
    });

    const mockStripe = {
      webhooks: {
        constructEvent: mockConstructEvent,
      },
    } as unknown as Stripe;

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
          payment_status: "paid",
          amount_total: 50000,
        },
      },
    });

    const mockStripe = {
      webhooks: {
        constructEvent: mockConstructEvent,
      },
    } as unknown as Stripe;

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
    } as unknown as Stripe;

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
    } as unknown as Stripe;

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
