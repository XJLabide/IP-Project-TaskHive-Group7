import type { SupportOutcome } from "./rules";

export type SupportTone = "positive" | "pending" | "negative" | "neutral";

const outcomeLabels: Record<SupportOutcome, string> = {
  FULL_REFUND: "Full refund",
  PARTIAL_PAYOUT: "Partial payout",
  FULL_PAYOUT: "Full payout",
};

export function resolutionLabel(outcome: SupportOutcome): string {
  return outcomeLabels[outcome];
}

const taskStatusLabels: Record<string, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  PENDING_APPROVAL: "Pending approval",
  PENDING_PAYMENT: "Awaiting payment",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  AWAITING_CONFIRMATION: "Awaiting confirmation",
  COMPLETED: "Completed",
  CANCELLATION_REVIEW: "Cancellation review",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed",
};

/** Database task statuses as Admin-facing labels. */
export function adminTaskStatusLabel(status: string): string {
  return taskStatusLabels[status] ?? status.replaceAll("_", " ").toLowerCase();
}

export function caseStatusTone(status: string): SupportTone {
  if (status === "OPEN" || status === "REVIEWING") return "pending";
  if (status === "RESOLVED") return "positive";
  if (status === "REJECTED") return "negative";
  return "neutral";
}

const actionLabels: Record<string, string> = {
  "support.cancellation.resolve": "Cancellation resolved",
  "support.dispute.resolve": "Dispute resolved",
  "support.report.dismiss": "Report dismissed",
  "support.report.warn": "Report upheld with warning",
  "support.report.suspend": "Report upheld with suspension",
  "admin.user.suspended": "User suspended",
  "admin.user.active": "User reinstated",
  "verification.appeal.approved": "Verification appeal approved",
  "verification.appeal.denied": "Verification appeal denied",
};

export function adminActionLabel(action: string): string {
  return actionLabels[action] ?? action.replaceAll(".", " ");
}

export function dueLabel(
  dueAt: Date,
  now: Date = new Date(),
): { text: string; overdue: boolean } {
  const overdue = dueAt.getTime() < now.getTime();
  const text = dueAt.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  });

  return { text: overdue ? `Overdue · ${text}` : `Due ${text}`, overdue };
}
