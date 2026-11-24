import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { requireUserMock, startCheckoutMock, refreshStatusMock, historyMock, findManyMock, findFirstMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  startCheckoutMock: vi.fn(),
  refreshStatusMock: vi.fn(),
  historyMock: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
  findManyMock: vi.fn(),
  findFirstMock: vi.fn(),
}));
vi.mock("@/lib/api/response", () => ({
  requireUser: requireUserMock,
  problem: (error: string, status: number) => Response.json({ error }, { status }),
  created: (data: unknown) => Response.json({ data }, { status: 201 }),
  ok: (data: unknown) => Response.json({ data }),
}));
vi.mock("@/lib/payments/service", () => ({ startCheckout: startCheckoutMock, refreshMayaSandboxPaymentStatus: refreshStatusMock }));
vi.mock("@/lib/payments/history", () => ({ getPaymentHistory: historyMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { task: { findMany: findManyMock, findFirst: findFirstMock } } }));
import { GET, POST } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  requireUserMock.mockResolvedValue({ session: { user: { id: "poster_1" } }, response: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("checkout API", () => {
  it("rejects a null request body without creating checkout", async () => {
    const response = await POST(new Request("https://example.com/api/payments/checkout", { method: "POST", body: "null" }));
    expect(response.status).toBe(422);
    expect(startCheckoutMock).not.toHaveBeenCalled();
  });

  it("keeps provider checkout unavailable until checkout attempts are safe", async () => {
    const response = await POST(new Request("https://example.com/api/payments/checkout", { method: "POST", body: JSON.stringify({ taskId: "task_1" }) }));
    expect(response.status).toBe(503);
    expect(startCheckoutMock).not.toHaveBeenCalled();
  });

  it("does not enable live checkout merely because adapter verification is attested", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("PAYMENT_PROVIDER", "stripe");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_synthetic");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_synthetic");
    vi.stubEnv("PAYMENT_SANDBOX_VERIFIED", "true");
    vi.stubEnv("PAYMENT_WEBHOOK_VERIFIED", "true");
    const response = await POST(new Request("https://example.com/api/payments/checkout", { method: "POST", body: JSON.stringify({ taskId: "task_1" }) }));
    expect(response.status).toBe(503);
    expect(startCheckoutMock).not.toHaveBeenCalled();
  });

  it("lists the Poster's pending-payment tasks for checkout", async () => {
    findManyMock.mockResolvedValue([{ id: "task_1", title: "Deliver groceries" }]);
    const response = await GET(new Request("https://example.com/api/payments/checkout"));
    expect(await response.json()).toEqual({ data: { tasks: [{ id: "task_1", title: "Deliver groceries" }], history: [], historyNextCursor: null } });
    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ posterId: "poster_1", status: "PENDING_PAYMENT" }) }));
  });


  it("refreshes Maya sandbox status for the signed-in Poster before reading it", async () => {
    findFirstMock.mockResolvedValue({ assignment: { status: "ACTIVE" }, payments: [{ status: "PAID_PENDING_COMPLETION" }] });
    const response = await GET(new Request("https://example.com/api/payments/checkout?taskId=task_1"));
    expect(await response.json()).toEqual({ data: { status: "confirmed" } });
    expect(refreshStatusMock).toHaveBeenCalledWith({ posterId: "poster_1", taskId: "task_1" });
  });

  it("reports confirmed payment only for the Poster's active assignment", async () => {
    findFirstMock.mockResolvedValue({ assignment: { status: "ACTIVE" }, payments: [{ status: "PAID_PENDING_COMPLETION" }] });
    const response = await GET(new Request("https://example.com/api/payments/checkout?taskId=task_1"));
    expect(await response.json()).toEqual({ data: { status: "confirmed" } });
    expect(findFirstMock).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "task_1", posterId: "poster_1" } }));
  });


  it("does not report an expired assignment as confirmed even when payment was received", async () => {
    findFirstMock.mockResolvedValue({ assignment: { status: "EXPIRED" }, payments: [{ status: "PAID_PENDING_COMPLETION" }] });
    const response = await GET(new Request("https://example.com/api/payments/checkout?taskId=task_1"));
    expect(await response.json()).toEqual({ data: { status: "needs_attention" } });
  });

  it("does not disclose payment status for another Poster's task", async () => {
    findFirstMock.mockResolvedValue(null);
    const response = await GET(new Request("https://example.com/api/payments/checkout?taskId=other_task"));
    expect(response.status).toBe(404);
    expect(findFirstMock).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "other_task", posterId: "poster_1" } }));
  });


  it("reports disputed payment as needing attention", async () => {
    findFirstMock.mockResolvedValue({ assignment: { status: "DISPUTED" }, payments: [{ status: "DISPUTED" }] });
    const response = await GET(new Request("https://example.com/api/payments/checkout?taskId=task_1"));
    expect(await response.json()).toEqual({ data: { status: "needs_attention" } });
  });


  it("reports a failed or unpaid payment without marking it confirmed", async () => {
    findFirstMock.mockResolvedValue({ assignment: { status: "PENDING_PAYMENT" }, payments: [{ status: "UNPAID" }] });
    const response = await GET(new Request("https://example.com/api/payments/checkout?taskId=task_1"));
    expect(await response.json()).toEqual({ data: { status: "unpaid" } });
  });


  it("starts a Maya checkout only in an explicitly configured non-production sandbox", async () => {
    vi.stubEnv("PAYMENT_PROVIDER", "maya");
    vi.stubEnv("MAYA_MODE", "sandbox");
    vi.stubEnv("VERCEL_ENV", "preview");
    startCheckoutMock.mockResolvedValue({ ok: true, paymentId: "payment_1", provider: "maya", checkoutUrl: "https://payments-web-sandbox.paymaya.com/checkout/1", amountCents: 12345, platformFeeCents: 617, payoutCents: 11728, holdExpiresAt: new Date("2100-01-01") });
    const response = await POST(new Request("https://preview.example/api/payments/checkout", { method: "POST", body: JSON.stringify({ taskId: "task_1" }) }));
    expect(response.status).toBe(201);
    expect((await response.json()).data.provider).toBe("maya");
    startCheckoutMock.mockClear();
    vi.stubEnv("VERCEL_ENV", "production");
    const productionResponse = await POST(new Request("https://taskhive.example/api/payments/checkout", { method: "POST", body: JSON.stringify({ taskId: "task_1" }) }));
    expect(productionResponse.status).toBe(503);
    expect(startCheckoutMock).not.toHaveBeenCalled();
  });

});
