import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  fakeProvider,
  selectPaymentProvider,
  verifyPaymongoSignature,
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
    expect(
      selectPaymentProvider({
        PAYMENT_PROVIDER: "paymongo",
        PAYMONGO_SECRET_KEY: "sk_test",
        PAYMONGO_WEBHOOK_SECRET: "whsec",
      }).name,
    ).toBe("paymongo");
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
