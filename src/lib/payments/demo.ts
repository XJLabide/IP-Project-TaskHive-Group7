import { canApprove } from "@/lib/applications/rules";
import type { DemoApplication } from "@/lib/applications/demo";
import type { TaskSummary } from "@/lib/tasks/types";
import { platformFeeCents } from "./fee";
import { holdExpiresAt, isHoldExpired } from "./hold";

export const DEMO_PROVIDER_LABEL = "PayMongo (evaluation)";

export type DemoAssignmentStatus =
  | "pending_payment"
  | "active"
  | "expired"
  | "completed"
  | "disputed";
export type DemoPaymentStatus = "unpaid" | "checkout_started" | "paid";

/** Browser-session mirror of the server assignment hold and payment row. */
export type DemoAssignment = {
  id: string;
  taskId: string;
  tasker: string;
  applicationId: string;
  status: DemoAssignmentStatus;
  selectedAt: string;
  holdExpiresAt: string;
  amountCents: number;
  platformFeeCents: number;
  payoutCents: number;
  paymentStatus: DemoPaymentStatus;
  attemptCount: number;
  lastError: string | null;
  paidAt: string | null;
  /** Completion evidence and confirmation timers. */
  completedAt?: string | null;
  completionNote?: string | null;
  completionUrl?: string | null;
  confirmedAt?: string | null;
  reminderSentAt?: string | null;
  autoReleaseAt?: string | null;
  payoutReleasedAt?: string | null;
  dispute?: {
    reason: string;
    openedBy: string;
    openedAt: string;
  } | null;
};

export function demoAssignmentForTask(
  assignments: readonly DemoAssignment[],
  taskId: string,
): DemoAssignment | null {
  return assignments.find((assignment) => assignment.taskId === taskId) ?? null;
}

export type SelectDemoTaskerResult =
  | { ok: true; assignments: DemoAssignment[]; assignment: DemoAssignment }
  | { ok: false; reason: string };

export function selectDemoTasker(input: {
  assignments: readonly DemoAssignment[];
  task: TaskSummary;
  application: DemoApplication;
  id: string;
  now?: Date;
}): SelectDemoTaskerResult {
  const now = input.now ?? new Date();
  const existing = demoAssignmentForTask(input.assignments, input.task.id);

  if (existing && existing.status !== "expired") {
    return { ok: false, reason: "This task already has a selected Tasker." };
  }

  const decision = canApprove({
    applicationStatus: input.application.status,
    taskStatus: input.task.status,
    verification: input.application.verification,
  });

  if (!decision.allowed) return { ok: false, reason: decision.reason };

  const amountCents =
    input.task.hiringMode === "fixed_price"
      ? Math.round(input.task.budget * 100)
      : input.application.amountCents ?? Math.round(input.task.budget * 100);
  const fee = platformFeeCents(amountCents);

  const assignment: DemoAssignment = {
    id: input.id,
    taskId: input.task.id,
    tasker: input.application.tasker,
    applicationId: input.application.id,
    status: "pending_payment",
    selectedAt: now.toISOString(),
    holdExpiresAt: holdExpiresAt(now).toISOString(),
    amountCents,
    platformFeeCents: fee,
    payoutCents: amountCents - fee,
    paymentStatus: "unpaid",
    attemptCount: 0,
    lastError: null,
    paidAt: null,
  };

  return {
    ok: true,
    assignment,
    assignments: [
      ...input.assignments.filter((item) => item.taskId !== input.task.id),
      assignment,
    ],
  };
}

/** Starting or retrying checkout never changes the fee snapshot or the hold. */
export function startDemoCheckout(assignment: DemoAssignment): DemoAssignment {
  if (assignment.status !== "pending_payment" || assignment.paymentStatus === "paid") {
    return assignment;
  }

  return {
    ...assignment,
    paymentStatus: "checkout_started",
    attemptCount: assignment.attemptCount + 1,
    lastError: null,
  };
}

export function recordPayment(
  assignment: DemoAssignment,
  outcome: "success" | "failure",
  now: Date = new Date(),
): DemoAssignment {
  if (assignment.status === "active" || assignment.status === "expired") {
    return assignment;
  }

  if (outcome === "failure") {
    return {
      ...assignment,
      paymentStatus: "unpaid",
      lastError: "The provider could not complete the payment. Try again.",
    };
  }

  return {
    ...assignment,
    status: "active",
    paymentStatus: "paid",
    paidAt: now.toISOString(),
    lastError: null,
  };
}

export function remainingMs(assignment: DemoAssignment, now: Date = new Date()): number {
  return Math.max(0, new Date(assignment.holdExpiresAt).getTime() - now.getTime());
}

export function formatRemaining(ms: number): string {
  if (ms <= 0) return "expired";

  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export function expireHoldIfDue(
  assignment: DemoAssignment,
  now: Date = new Date(),
): { assignment: DemoAssignment; expired: boolean } {
  if (assignment.status !== "pending_payment") {
    return { assignment, expired: false };
  }

  if (!isHoldExpired(new Date(assignment.holdExpiresAt), now)) {
    return { assignment, expired: false };
  }

  return { assignment: { ...assignment, status: "expired" }, expired: true };
}
