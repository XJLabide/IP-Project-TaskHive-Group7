import type { TaskLifecycleStatus } from "@/lib/tasks/lifecycle";
import type { FulfillmentMode } from "@/lib/tasks/policy";

export const COMPLETION_REMINDER_HOURS = 24;
export const COMPLETION_AUTO_RELEASE_HOURS = 48;
export const REVIEW_WINDOW_DAYS = 14;

const hourMs = 60 * 60 * 1000;
const dayMs = 24 * hourMs;

export type CompletionRuleCode =
  | "not_tasker"
  | "not_poster"
  | "not_participant"
  | "invalid_state"
  | "not_submitted"
  | "already_submitted"
  | "already_released"
  | "already_disputed"
  | "dispute_open"
  | "not_unlocked"
  | "already_reviewed"
  | "invalid_rating"
  | "invalid_comment";

export type CompletionDecision =
  | { allowed: true }
  | { allowed: false; code: CompletionRuleCode; reason: string };

const ALLOWED: CompletionDecision = { allowed: true };

function deny(code: CompletionRuleCode, reason: string): CompletionDecision {
  return { allowed: false, code, reason };
}

/** Local work needs a note; remote work needs the deliverable link. */
export function evidenceError(
  mode: FulfillmentMode,
  evidence: { note: string | null; url: string | null },
): string | null {
  if (mode === "remote") {
    return evidence.url?.trim() ? null : "Add the remote deliverable before submitting.";
  }

  return evidence.note?.trim() ? null : "Add a completion note before submitting.";
}

export function reminderAt(submittedAt: Date): Date {
  return new Date(submittedAt.getTime() + COMPLETION_REMINDER_HOURS * hourMs);
}

/** Assignments completed before this instant are due for their one reminder. */
export function reminderCutoff(now: Date): Date {
  return new Date(now.getTime() - COMPLETION_REMINDER_HOURS * hourMs);
}

export function autoReleaseAt(submittedAt: Date): Date {
  return new Date(submittedAt.getTime() + COMPLETION_AUTO_RELEASE_HOURS * hourMs);
}

export function reviewPublishAt(completedAt: Date): Date {
  return new Date(completedAt.getTime() + REVIEW_WINDOW_DAYS * dayMs);
}

const submittableStatuses: readonly TaskLifecycleStatus[] = [
  "assigned",
  "in_progress",
];

export function canSubmitCompletion(input: {
  actorId: string;
  taskerId: string;
  taskStatus: TaskLifecycleStatus;
  completedAt: Date | null;
}): CompletionDecision {
  if (input.actorId !== input.taskerId) {
    return deny("not_tasker", "Only the assigned Tasker can submit completion.");
  }

  if (input.completedAt) {
    return deny("already_submitted", "Completion was already submitted.");
  }

  if (!submittableStatuses.includes(input.taskStatus)) {
    return deny("invalid_state", "This assignment is not ready for completion.");
  }

  return ALLOWED;
}

export function canConfirmCompletion(input: {
  actorId: string;
  posterId: string;
  taskStatus: TaskLifecycleStatus;
  completedAt: Date | null;
  payoutReleasedAt: Date | null;
  openDispute: boolean;
}): CompletionDecision {
  if (input.actorId !== input.posterId) {
    return deny("not_poster", "Only the Poster can confirm completion.");
  }

  if (!input.completedAt) {
    return deny("not_submitted", "The Tasker has not submitted completion yet.");
  }

  if (input.openDispute) {
    return deny("dispute_open", "Resolve the open dispute before releasing payout.");
  }

  if (input.payoutReleasedAt) {
    return deny("already_released", "This payout was already released.");
  }

  if (input.taskStatus !== "awaiting_confirmation") {
    return deny("invalid_state", "This task is not awaiting confirmation.");
  }

  return ALLOWED;
}

export function canOpenDispute(input: {
  actorId: string;
  posterId: string;
  taskerId: string;
  taskStatus: TaskLifecycleStatus;
  payoutReleasedAt: Date | null;
  openDispute: boolean;
}): CompletionDecision {
  if (input.actorId !== input.posterId && input.actorId !== input.taskerId) {
    return deny("not_participant", "Only the Poster or assigned Tasker can dispute.");
  }

  if (input.payoutReleasedAt) {
    return deny("already_released", "Payout was released; open a support report instead.");
  }

  if (input.openDispute) {
    return deny("already_disputed", "A dispute is already open for this task.");
  }

  if (
    !["assigned", "in_progress", "awaiting_confirmation"].includes(
      input.taskStatus,
    )
  ) {
    return deny("invalid_state", "This task is not open for a completion dispute.");
  }

  return ALLOWED;
}

export function canSubmitReview(input: {
  actorId: string;
  posterId: string;
  taskerId: string;
  taskStatus: TaskLifecycleStatus;
  alreadyReviewed: boolean;
  rating: number;
  comment: string | null;
}): CompletionDecision {
  if (input.taskStatus !== "completed") {
    return deny("not_unlocked", "Reviews unlock after completion or payout release.");
  }

  if (input.actorId !== input.posterId && input.actorId !== input.taskerId) {
    return deny("not_participant", "Only the Poster or assigned Tasker can review.");
  }

  if (input.alreadyReviewed) {
    return deny("already_reviewed", "You already reviewed this task.");
  }

  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return deny("invalid_rating", "Choose a rating from 1 to 5.");
  }

  if ((input.comment?.length ?? 0) > 2000) {
    return deny("invalid_comment", "Keep the review to 2,000 characters or fewer.");
  }

  return ALLOWED;
}
