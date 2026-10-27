import type { TaskLifecycleStatus } from "@/lib/tasks/lifecycle";

export const REVIEW_TARGET_BUSINESS_DAYS = 2;

export type SupportOutcome = "FULL_REFUND" | "PARTIAL_PAYOUT" | "FULL_PAYOUT";
export type ReportDecision = "dismiss" | "warn" | "suspend";
export type ModerationStatusValue = "OPEN" | "REVIEWING" | "RESOLVED" | "REJECTED";

export type SupportRuleCode =
  | "not_participant"
  | "not_hired"
  | "already_open"
  | "dispute_open"
  | "already_resolved"
  | "invalid_amount";

export type SupportDecision =
  | { allowed: true }
  | { allowed: false; code: SupportRuleCode; reason: string };

const ALLOWED: SupportDecision = { allowed: true };

function deny(code: SupportRuleCode, reason: string): SupportDecision {
  return { allowed: false, code, reason };
}

const manilaOffsetMs = 8 * 60 * 60 * 1000;

/** Adds business days on the Manila calendar, skipping Saturday and Sunday. */
export function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from.getTime() + manilaOffsetMs);
  let added = 0;

  while (added < days) {
    result.setUTCDate(result.getUTCDate() + 1);
    const day = result.getUTCDay();
    if (day !== 0 && day !== 6) added += 1;
  }

  return new Date(result.getTime() - manilaOffsetMs);
}

export function reviewDueAt(now: Date): Date {
  return addBusinessDays(now, REVIEW_TARGET_BUSINESS_DAYS);
}

const cancellableStatuses: readonly TaskLifecycleStatus[] = [
  "assigned",
  "in_progress",
  "awaiting_confirmation",
];

export function canRequestCancellation(input: {
  actorId: string;
  posterId: string;
  taskerId: string;
  taskStatus: TaskLifecycleStatus;
  openCancellation: boolean;
  openDispute: boolean;
}): SupportDecision {
  if (input.actorId !== input.posterId && input.actorId !== input.taskerId) {
    return deny("not_participant", "Only the Poster or assigned Tasker can request cancellation.");
  }

  if (!cancellableStatuses.includes(input.taskStatus)) {
    return deny("not_hired", "Cancellation is only available after hire and before completion.");
  }

  if (input.openDispute) {
    return deny("dispute_open", "Resolve the open dispute before requesting cancellation.");
  }

  if (input.openCancellation) {
    return deny("already_open", "A cancellation request is already open for this task.");
  }

  return ALLOWED;
}

export function canResolveSupportCase(input: {
  status: ModerationStatusValue;
}): SupportDecision {
  if (input.status !== "OPEN" && input.status !== "REVIEWING") {
    return deny("already_resolved", "This support case is already resolved.");
  }

  return ALLOWED;
}

export type PayoutEffect = {
  taskStatus: "cancelled" | "completed";
  paymentStatus: "REFUNDED" | "RELEASED";
  payoutCents: number;
  releasePayout: boolean;
};

export type PayoutEffectResult =
  | { ok: true; effect: PayoutEffect }
  | { ok: false; code: SupportRuleCode; reason: string };

/** The money outcome an Admin resolution applies to the held payout. */
export function payoutEffect(
  outcome: SupportOutcome,
  input: { netCents: number; requestedCents?: number },
): PayoutEffectResult {
  if (outcome === "FULL_REFUND") {
    return {
      ok: true,
      effect: {
        taskStatus: "cancelled",
        paymentStatus: "REFUNDED",
        payoutCents: 0,
        releasePayout: false,
      },
    };
  }

  if (outcome === "FULL_PAYOUT") {
    return {
      ok: true,
      effect: {
        taskStatus: "completed",
        paymentStatus: "RELEASED",
        payoutCents: input.netCents,
        releasePayout: true,
      },
    };
  }

  const partial = input.requestedCents ?? 0;
  if (
    !Number.isInteger(partial) ||
    partial <= 0 ||
    partial >= input.netCents
  ) {
    return {
      ok: false,
      code: "invalid_amount",
      reason: "A partial payout must be greater than zero and below the full payout.",
    };
  }

  return {
    ok: true,
    effect: {
      taskStatus: "completed",
      paymentStatus: "RELEASED",
      payoutCents: partial,
      releasePayout: true,
    },
  };
}

export function reportDecision(decision: ReportDecision): {
  status: "RESOLVED" | "REJECTED";
  suspendUser: boolean;
} {
  if (decision === "dismiss") {
    return { status: "REJECTED", suspendUser: false };
  }

  return { status: "RESOLVED", suspendUser: decision === "suspend" };
}
