import { createHmac, createSign, generateKeyPairSync } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

const { prismaMock, txMock } = vi.hoisted(() => {
  const txMock = {
    paymentEvent: { create: vi.fn().mockResolvedValue({ id: "event_record" }), update: vi.fn().mockResolvedValue({}) },
    payment: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    assignment: { findUnique: vi.fn().mockResolvedValue({ id: "assignment_1", taskerId: "tasker_1", status: "PENDING_PAYMENT", holdExpiresAt: new Date("2100-01-01") }), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    task: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    payout: { upsert: vi.fn().mockResolvedValue({}) },
    notification: { upsert: vi.fn().mockResolvedValue({ id: "notification_1" }) },
  };
  return {
    txMock,
    prismaMock: {
      payment: { findFirst: vi.fn().mockResolvedValue({ id: "payment_1", taskId: "task_1", posterId: "poster_1", amountCents: 1000, platformFeeCents: 50, status: "CHECKOUT_STARTED" }) },
      $transaction: vi.fn(async (callback: (tx: typeof txMock) => unknown) => callback(txMock)),
    },
  };
});
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/notifications", () => ({ buildNotificationCreateData: vi.fn(() => ({ eventKey: "event_key" })), queueNotificationEmail: vi.fn(), notifyUser: vi.fn() }));
vi.mock("@/lib/api/response", () => ({
  ok: (data: unknown) => Response.json({ data }),
  problem: (error: string, status: number) => Response.json({ error }, { status }),
}));

import { POST } from "./route";

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("payment webhook", () => {
  it("acknowledges a signed but unpaid Stripe checkout without activating payment", async () => {
    vi.stubEnv("PAYMENT_PROVIDER", "stripe");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_example");
    const body = JSON.stringify({ id: "evt_unpaid", type: "checkout.session.completed", data: { object: { id: "cs_1", payment_status: "unpaid", amount_total: 1000 } } });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac("sha256", "whsec_example").update(`${timestamp}.${body}`).digest("hex");
    const response = await POST(new Request("https://example.com/api/payments/webhook", { method: "POST", body, headers: { "stripe-signature": `t=${timestamp},v1=${signature}` } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { received: true, outcome: "ignored" } });
    expect(txMock.payment.updateMany).not.toHaveBeenCalled();
  });

  it("activates a paid signed checkout once and accepts a duplicate delivery", async () => {
    vi.stubEnv("PAYMENT_PROVIDER", "stripe");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_example");
    const body = JSON.stringify({ id: "evt_paid", type: "checkout.session.completed", data: { object: { id: "cs_1", payment_status: "paid", amount_total: 1000 } } });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac("sha256", "whsec_example").update(`${timestamp}.${body}`).digest("hex");
    const request = () => new Request("https://example.com/api/payments/webhook", { method: "POST", body, headers: { "stripe-signature": `t=${timestamp},v1=${signature}` } });
    const first = await POST(request());
    expect(await first.json()).toEqual({ data: { received: true, outcome: "activated" } });
    txMock.paymentEvent.create.mockRejectedValueOnce({ code: "P2002" });
    const duplicate = await POST(request());
    expect(await duplicate.json()).toEqual({ data: { received: true, outcome: "duplicate" } });
    expect(txMock.assignment.updateMany).toHaveBeenCalledTimes(1);
  });

  it("rejects a webhook with an invalid signature", async () => {
    vi.stubEnv("PAYMENT_PROVIDER", "stripe");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_example");
    const body = JSON.stringify({ id: "evt_bad", type: "checkout.session.completed" });
    const response = await POST(new Request("https://example.com/api/payments/webhook", { method: "POST", body, headers: { "stripe-signature": `t=${Math.floor(Date.now() / 1000)},v1=invalid` } }));
    expect(response.status).toBe(400);
    expect(prismaMock.payment.findFirst).not.toHaveBeenCalled();
  });


  it("accepts a Maya sandbox signature and applies the matching payment event", async () => {
    vi.stubEnv("PAYMENT_PROVIDER", "maya");
    vi.stubEnv("MAYA_MODE", "sandbox");
    vi.stubEnv("MAYA_PUBLIC_API_KEY", "pk-test");
    vi.stubEnv("VERCEL_ENV", "preview");
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();
    vi.stubEnv("MAYA_WEBHOOK_PUBLIC_KEY_1", publicPem);
    vi.stubEnv("MAYA_WEBHOOK_PUBLIC_KEY_2", publicPem);
    const payload = { id: "payment_1", items: [{ name: "Test task", quantity: "1" }], status: "PAYMENT_SUCCESS", isPaid: true, amount: "10", currency: "PHP", updatedAt: new Date().toISOString() };
    const flattened = Object.entries(payload).filter(([, value]) => !Array.isArray(value)).map(([key, value]) => `${key}=${value}`).sort().join("&");
    const nonce = "webhook_nonce";
    const signer = createSign("RSA-SHA256");
    signer.update(`${flattened}&nonce=${nonce}`);
    signer.end();
    const signature = signer.sign(privateKey).toString("hex");
    const response = await POST(new Request("https://preview.example/api/payments/webhook", {
      method: "POST", body: JSON.stringify(payload),
      headers: { "x-maya-webhook-timestamp": String(Date.now()), "x-maya-webhook-signature": `nonce=${nonce},v1=${signature}` },
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { received: true, outcome: "activated" } });
  });

});
