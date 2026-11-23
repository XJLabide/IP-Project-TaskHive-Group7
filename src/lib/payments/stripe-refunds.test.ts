import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Stateful persistence boundary: exercise the real Stripe signature parser and
// payment service across deliveries, rather than returning a match for every ID.
const { state, prismaMock, tx } = vi.hoisted(() => {
  const state = {
    payment: { id: "payment_1", taskId: "task_1", posterId: "poster_1", amountCents: 1000, platformFeeCents: 50, status: "CHECKOUT_STARTED", refundedCents: 0 },
    attempt: { id: "attempt_1", provider: "stripe", providerCheckoutId: "cs_1", providerPaymentIntentId: null as string | null, providerChargeId: null as string | null, status: "CHECKOUT_STARTED" },
    events: new Map<string, Record<string, unknown>>(),
  };
  const tx = {
    paymentAttempt: {
      update: vi.fn(async ({ data }) => Object.assign(state.attempt, data)),
      updateMany: vi.fn(async () => ({ count: 1 })),
      findUnique: vi.fn(async () => state.attempt),
    },
    payment: {
      findUnique: vi.fn(async () => state.payment),
      updateMany: vi.fn(async ({ where, data }) => {
        if (!where.status.in.includes(state.payment.status) || (where.refundedCents && state.payment.refundedCents >= where.refundedCents.lt)) return { count: 0 };
        Object.assign(state.payment, data);
        return { count: 1 };
      }),
    },
    paymentEvent: {
      upsert: vi.fn(async ({ create }) => {
        if (!state.events.has(create.eventId)) state.events.set(create.eventId, { id: create.eventId, processedAt: null, ...create });
        return state.events.get(create.eventId)!;
      }),
      update: vi.fn(async ({ where, data }) => Object.assign(state.events.get(where.id)!, data)),
    },
    assignment: {
      findUnique: vi.fn(async () => ({ id: "assignment_1", taskerId: "tasker_1", status: "PENDING_PAYMENT", holdExpiresAt: new Date("2100-01-01") })),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    task: { updateMany: vi.fn(async () => ({ count: 1 })) },
    payout: { upsert: vi.fn(async () => ({})) },
    notification: { upsert: vi.fn(async () => ({ id: "notification_1" })) },
  };
  const prismaMock = {
    payment: { findUnique: vi.fn(async () => state.payment) },
    cancellationRequest: { findUnique: vi.fn(async () => ({
      id: "case_1", status: "OPEN", taskId: "task_1", requestedById: "poster_1",
      task: { posterId: "poster_1", title: "Task", status: "CANCELLATION_REVIEW", assignment: { taskerId: "tasker_1" } },
    })) },
    paymentAttempt: { findFirst: vi.fn(async ({ where }) => {
      if (where.provider !== state.attempt.provider) return null;
      const matches = where.OR.some((clause: Record<string, unknown>) => Object.entries(clause).every(([key, value]) => state.attempt[key as keyof typeof state.attempt] === value));
      return matches ? { ...state.attempt, payment: { ...state.payment } } : null;
    }) },
    paymentEvent: { findMany: vi.fn(async ({ where }) => [...state.events.values()].filter((event) => event.provider === where.provider && !event.processedAt && where.OR.some((clause: Record<string, { in: string[] }>) => Object.entries(clause).some(([key, value]) => value.in.includes(event[key] as string))))) },
    $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
  };
  return { state, tx, prismaMock };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/notifications", () => ({
  buildNotificationCreateData: vi.fn(() => ({ eventKey: "active" })),
  notifyUser: vi.fn(), queueNotificationEmail: vi.fn(),
}));

import { handleProviderEvent } from "./service";
import { stripeProvider } from "./provider";
import { resolveCancellation } from "@/lib/support/service";

const secret = "whsec_refund_test";
const provider = stripeProvider({ secretKey: "sk_test_placeholder", webhookSecret: secret });
async function deliver(id: string, type: string, object: Record<string, unknown>) {
  const rawBody = JSON.stringify({ id, object: "event", type, data: { object } });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return handleProviderEvent({ provider, rawBody, headers: new Headers({ "stripe-signature": `t=${timestamp},v1=${signature}` }) });
}
const checkout = (intent: unknown = "pi_1") => ({ id: "cs_1", object: "checkout.session", payment_status: "paid", amount_total: 1000, payment_intent: intent });
const charge = (amount: unknown, intent: unknown = "pi_1") => ({ id: "ch_1", object: "charge", amount: 1000, amount_refunded: amount, payment_intent: intent, metadata: {} });

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(state.payment, { status: "CHECKOUT_STARTED", refundedCents: 0 });
  Object.assign(state.attempt, { provider: "stripe", providerPaymentIntentId: null, providerChargeId: null, status: "CHECKOUT_STARTED" });
  state.events.clear();
});

describe("signed Stripe refund correlation", () => {
  it("correlates a native Payment Intent refund with the completed Checkout Session", async () => {
    expect(await deliver("evt_paid", "checkout.session.completed", checkout())).toEqual({ ok: true, outcome: "activated" });
    expect(state.attempt.providerPaymentIntentId).toBe("pi_1");
    expect(await deliver("evt_refund", "charge.refunded", charge(1000))).toEqual({ ok: true, outcome: "refunded" });
    expect(state.payment).toMatchObject({ status: "REFUNDED", refundedCents: 1000 });
    expect(state.attempt).toMatchObject({ status: "REFUNDED", providerChargeId: "ch_1" });
    expect(state.events.get("evt_refund")).toMatchObject({ paymentId: "payment_1", attemptId: "attempt_1", processedAt: expect.any(Date) });
  });

  it("holds a partial refund for review and applies cumulative totals monotonically", async () => {
    await deliver("evt_paid", "checkout.session.completed", checkout());
    expect(await deliver("evt_partial", "charge.refunded", charge(250))).toEqual({ ok: true, outcome: "partially_refunded" });
    expect(state.payment).toMatchObject({ status: "DISPUTED", refundedCents: 250 });
    expect(state.attempt.status).toBe("SUCCEEDED");
    expect(await deliver("evt_partial", "charge.refunded", charge(250))).toEqual({ ok: true, outcome: "duplicate" });
    await deliver("evt_partial_2", "charge.refunded", charge(600));
    await deliver("evt_stale", "charge.refunded", charge(250));
    expect(state.payment.refundedCents).toBe(600);
    await deliver("evt_full", "charge.refunded", charge(1000));
    await deliver("evt_stale_2", "charge.refunded", charge(600));
    expect(state.payment).toMatchObject({ status: "REFUNDED", refundedCents: 1000 });
  });

  it("blocks support resolution after a provider refund instead of erasing it or overpaying", async () => {
    await deliver("evt_paid", "checkout.session.completed", checkout());
    await deliver("evt_partial", "charge.refunded", charge(250));
    prismaMock.$transaction.mockClear();
    expect(await resolveCancellation({ adminId: "admin_1", caseId: "case_1", outcome: "FULL_PAYOUT" })).toMatchObject({ ok: false, code: "invalid_state" });
    expect(state.payment.refundedCents).toBe(250);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("matches a Charge-only refund after receiving an expanded Payment Intent", async () => {
    await deliver("evt_paid", "checkout.session.completed", checkout({ id: "pi_1", latest_charge: { id: "ch_1" } }));
    expect(await deliver("evt_refund", "charge.refunded", charge(1000, null))).toEqual({ ok: true, outcome: "refunded" });
  });

  it("replays a refund received before checkout completion binds the IDs", async () => {
    expect(await deliver("evt_early", "charge.refunded", charge(250))).toEqual({ ok: true, outcome: "pending_reconciliation" });
    expect(state.events.get("evt_early")?.processedAt).toBeNull();
    await deliver("evt_paid", "checkout.session.completed", checkout());
    expect(state.payment).toMatchObject({ status: "DISPUTED", refundedCents: 250 });
    expect(state.events.get("evt_early")?.processedAt).toBeInstanceOf(Date);
  });

  it("keeps a matched refund pending until capture is recorded", async () => {
    state.attempt.providerPaymentIntentId = "pi_1";
    expect(await deliver("evt_early", "charge.refunded", charge(1000))).toEqual({ ok: true, outcome: "pending_reconciliation" });
    await deliver("evt_paid", "checkout.session.completed", checkout());
    expect(state.payment.status).toBe("REFUNDED");
  });

  it("binds IDs and replays pending refunds when an old completion is redelivered", async () => {
    await deliver("evt_paid", "checkout.session.completed", checkout());
    state.attempt.providerPaymentIntentId = null;
    await deliver("evt_refund", "charge.refunded", charge(1000));
    expect(state.events.get("evt_refund")?.processedAt).toBeNull();
    expect(await deliver("evt_paid", "checkout.session.completed", checkout())).toEqual({ ok: true, outcome: "duplicate" });
    expect(state.payment.status).toBe("REFUNDED");
    expect(tx.assignment.updateMany).toHaveBeenCalledTimes(1);
    await deliver("evt_async", "checkout.session.async_payment_succeeded", checkout());
    expect(state.attempt.status).toBe("REFUNDED");
  });

  it("does not downgrade a refunded attempt when a success read a stale pre-capture snapshot", async () => {
    await deliver("evt_paid", "checkout.session.completed", checkout());
    await deliver("evt_refund", "charge.refunded", charge(1000));
    prismaMock.paymentAttempt.findFirst.mockResolvedValueOnce({ ...state.attempt, status: "CHECKOUT_STARTED", payment: { ...state.payment } });
    expect(await deliver("evt_async", "checkout.session.async_payment_succeeded", checkout())).toEqual({ ok: true, outcome: "duplicate" });
    expect(state.attempt.status).toBe("REFUNDED");
  });

  it.each([null, 0, -1, 1001, 1.5])("retains invalid refund total %j for reconciliation", async (amount) => {
    await deliver("evt_paid", "checkout.session.completed", checkout());
    expect(await deliver("evt_bad", "charge.refunded", charge(amount))).toEqual({ ok: true, outcome: "pending_reconciliation" });
    expect(state.payment).toMatchObject({ status: "PAID_PENDING_COMPLETION", refundedCents: 0 });
    expect(state.events.get("evt_bad")?.processedAt).toBeNull();
  });

  it("does not correlate IDs across providers or an unknown charge", async () => {
    state.attempt.providerPaymentIntentId = "pi_1";
    state.attempt.provider = "paymongo";
    expect(await deliver("evt_other", "charge.refunded", charge(1000))).toEqual({ ok: true, outcome: "pending_reconciliation" });
    expect(tx.payment.updateMany).not.toHaveBeenCalled();
  });
});
