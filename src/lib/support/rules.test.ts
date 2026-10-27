import { describe, expect, it } from "vitest";
import {
  addBusinessDays,
  canRequestCancellation,
  canResolveSupportCase,
  payoutEffect,
  reportDecision,
  reviewDueAt,
} from "./rules";

describe("support review target", () => {
  it("counts two business days and skips the weekend", () => {
    const friday = new Date("2026-10-30T09:00:00.000Z");

    expect(addBusinessDays(friday, 2).toISOString()).toBe(
      "2026-11-03T09:00:00.000Z",
    );
    expect(reviewDueAt(friday).toISOString()).toBe("2026-11-03T09:00:00.000Z");
  });

  it("uses the Manila weekend boundary, not UTC", () => {
    const lateFridayUtc = new Date("2026-10-30T17:00:00.000Z");

    expect(addBusinessDays(lateFridayUtc, 2).toISOString()).toBe(
      "2026-11-02T17:00:00.000Z",
    );
  });
});

describe("cancellation requests", () => {
  const base = {
    actorId: "poster_1",
    posterId: "poster_1",
    taskerId: "tasker_1",
    taskStatus: "assigned" as const,
    openCancellation: false,
    openDispute: false,
  };

  it("lets either participant request cancellation after hire", () => {
    expect(canRequestCancellation(base)).toEqual({ allowed: true });
    expect(
      canRequestCancellation({ ...base, actorId: "tasker_1" }),
    ).toEqual({ allowed: true });
    expect(
      canRequestCancellation({ ...base, actorId: "stranger" }),
    ).toMatchObject({ allowed: false, code: "not_participant" });
  });

  it("refuses cancellation before hire or once a case is open", () => {
    expect(
      canRequestCancellation({ ...base, taskStatus: "pending_payment" }),
    ).toMatchObject({ allowed: false, code: "not_hired" });
    expect(
      canRequestCancellation({ ...base, openCancellation: true }),
    ).toMatchObject({ allowed: false, code: "already_open" });
    expect(
      canRequestCancellation({ ...base, openDispute: true }),
    ).toMatchObject({ allowed: false, code: "dispute_open" });
    expect(
      canRequestCancellation({ ...base, taskStatus: "completed" }),
    ).toMatchObject({ allowed: false, code: "not_hired" });
  });
});

describe("case resolution", () => {
  it("only resolves a case that is still open or reviewing", () => {
    expect(canResolveSupportCase({ status: "OPEN" })).toEqual({ allowed: true });
    expect(canResolveSupportCase({ status: "REVIEWING" })).toEqual({
      allowed: true,
    });
    expect(canResolveSupportCase({ status: "RESOLVED" })).toMatchObject({
      allowed: false,
      code: "already_resolved",
    });
  });

  it("maps full refund, partial payout, and full payout", () => {
    const net = 42750;

    expect(payoutEffect("FULL_REFUND", { netCents: net })).toMatchObject({
      ok: true,
      effect: {
        taskStatus: "cancelled",
        paymentStatus: "REFUNDED",
        payoutCents: 0,
        releasePayout: false,
      },
    });
    expect(payoutEffect("FULL_PAYOUT", { netCents: net })).toMatchObject({
      ok: true,
      effect: {
        taskStatus: "completed",
        paymentStatus: "RELEASED",
        payoutCents: net,
        releasePayout: true,
      },
    });
    expect(
      payoutEffect("PARTIAL_PAYOUT", { netCents: net, requestedCents: 20000 }),
    ).toMatchObject({
      ok: true,
      effect: {
        taskStatus: "completed",
        paymentStatus: "RELEASED",
        payoutCents: 20000,
        releasePayout: true,
      },
    });
  });

  it("rejects a partial payout outside the task's payout", () => {
    expect(
      payoutEffect("PARTIAL_PAYOUT", { netCents: 42750, requestedCents: 0 }),
    ).toMatchObject({ ok: false, code: "invalid_amount" });
    expect(
      payoutEffect("PARTIAL_PAYOUT", { netCents: 42750, requestedCents: 42750 }),
    ).toMatchObject({ ok: false, code: "invalid_amount" });
    expect(
      payoutEffect("PARTIAL_PAYOUT", { netCents: 42750, requestedCents: 50000 }),
    ).toMatchObject({ ok: false, code: "invalid_amount" });
  });
});

describe("report decisions", () => {
  it("keeps reports separate from disputes and maps the outcome", () => {
    expect(reportDecision("dismiss")).toEqual({
      status: "REJECTED",
      suspendUser: false,
    });
    expect(reportDecision("warn")).toEqual({
      status: "RESOLVED",
      suspendUser: false,
    });
    expect(reportDecision("suspend")).toEqual({
      status: "RESOLVED",
      suspendUser: true,
    });
  });
});
