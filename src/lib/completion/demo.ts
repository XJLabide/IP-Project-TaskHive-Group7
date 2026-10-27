import type { DemoAssignment } from "@/lib/payments/demo";
import type { TaskSummary } from "@/lib/tasks/types";
import type { TaskLifecycleStatus } from "@/lib/tasks/lifecycle";
import {
  autoReleaseAt,
  canConfirmCompletion,
  canOpenDispute,
  canSubmitCompletion,
  canSubmitReview,
  evidenceError,
  reminderCutoff,
  reviewPublishAt,
} from "./rules";

function demoTaskStatus(assignment: DemoAssignment): TaskLifecycleStatus {
  if (assignment.status === "pending_payment") return "pending_payment";
  if (assignment.status === "completed") return "completed";
  if (assignment.status === "disputed") return "disputed";
  if (assignment.completedAt) return "awaiting_confirmation";
  if (assignment.status === "active") return "assigned";
  return "open";
}

export type DemoCompletionResult =
  | { ok: true; assignment: DemoAssignment }
  | { ok: false; reason: string };

function failure(reason: string): DemoCompletionResult {
  return { ok: false, reason };
}

/** Browser-session mirror of the completion rules for the task detail demo. */
export function submitDemoCompletion(input: {
  assignment: DemoAssignment;
  task: TaskSummary;
  actor: string;
  note: string | null;
  url: string | null;
  now?: Date;
}): DemoCompletionResult {
  const { assignment, task } = input;
  const now = input.now ?? new Date();

  const decision = canSubmitCompletion({
    actorId: input.actor,
    taskerId: assignment.tasker,
    taskStatus: demoTaskStatus(assignment),
    completedAt: assignment.completedAt ? new Date(assignment.completedAt) : null,
  });

  if (!decision.allowed) return failure(decision.reason);

  const note = input.note?.trim() || null;
  const url = input.url?.trim() || null;
  const problem = evidenceError(task.fulfillmentMode, { note, url });
  if (problem) return failure(problem);

  return {
    ok: true,
    assignment: {
      ...assignment,
      completedAt: now.toISOString(),
      completionNote: note,
      completionUrl: url,
      autoReleaseAt: autoReleaseAt(now).toISOString(),
      reminderSentAt: null,
      dispute: null,
      payoutReleasedAt: null,
    },
  };
}

export function confirmDemoCompletion(input: {
  assignment: DemoAssignment;
  task: TaskSummary;
  actor: string;
  now?: Date;
}): DemoCompletionResult {
  const { assignment, task } = input;
  const now = input.now ?? new Date();

  const decision = canConfirmCompletion({
    actorId: input.actor,
    posterId: task.poster,
    taskStatus: demoTaskStatus(assignment),
    completedAt: assignment.completedAt ? new Date(assignment.completedAt) : null,
    payoutReleasedAt: assignment.payoutReleasedAt
      ? new Date(assignment.payoutReleasedAt)
      : null,
    openDispute: Boolean(assignment.dispute),
  });

  if (!decision.allowed) return failure(decision.reason);

  return {
    ok: true,
    assignment: {
      ...assignment,
      status: "completed",
      confirmedAt: now.toISOString(),
      payoutReleasedAt: now.toISOString(),
    },
  };
}

export function disputeDemoCompletion(input: {
  assignment: DemoAssignment;
  task: TaskSummary;
  actor: string;
  reason: string;
  now?: Date;
}): DemoCompletionResult {
  const { assignment, task } = input;
  const now = input.now ?? new Date();
  const reason = input.reason.trim();

  if (!reason) {
    return failure("Explain the dispute before opening it.");
  }

  const decision = canOpenDispute({
    actorId: input.actor,
    posterId: task.poster,
    taskerId: assignment.tasker,
    taskStatus: demoTaskStatus(assignment),
    payoutReleasedAt: assignment.payoutReleasedAt
      ? new Date(assignment.payoutReleasedAt)
      : null,
    openDispute: Boolean(assignment.dispute),
  });

  if (!decision.allowed) return failure(decision.reason);

  return {
    ok: true,
    assignment: {
      ...assignment,
      status: "disputed",
      payoutReleasedAt: assignment.payoutReleasedAt ?? null,
      dispute: {
        reason,
        openedBy: input.actor,
        openedAt: now.toISOString(),
      },
    },
  };
}

/** The one 24-hour Poster reminder; no-op after the first. */
export function remindDemoCompletionIfDue(
  assignment: DemoAssignment,
  now: Date = new Date(),
): { assignment: DemoAssignment; reminded: boolean } {
  if (
    assignment.status !== "active" ||
    !assignment.completedAt ||
    assignment.reminderSentAt ||
    assignment.payoutReleasedAt ||
    assignment.dispute
  ) {
    return { assignment, reminded: false };
  }

  const submittedAt = new Date(assignment.completedAt);
  if (submittedAt.getTime() > reminderCutoff(now).getTime()) {
    return { assignment, reminded: false };
  }

  return {
    assignment: { ...assignment, reminderSentAt: now.toISOString() },
    reminded: true,
  };
}

/** Undisputed auto-release at 48 hours. */
export function releaseDemoCompletionIfDue(
  assignment: DemoAssignment,
  now: Date = new Date(),
): { assignment: DemoAssignment; released: boolean } {
  if (
    assignment.status !== "active" ||
    !assignment.completedAt ||
    assignment.payoutReleasedAt ||
    assignment.dispute
  ) {
    return { assignment, released: false };
  }

  const releaseAt = assignment.autoReleaseAt
    ? new Date(assignment.autoReleaseAt)
    : autoReleaseAt(new Date(assignment.completedAt));

  if (releaseAt.getTime() > now.getTime()) {
    return { assignment, released: false };
  }

  return {
    assignment: {
      ...assignment,
      status: "completed",
      payoutReleasedAt: now.toISOString(),
      confirmedAt: assignment.confirmedAt ?? now.toISOString(),
    },
    released: true,
  };
}

export type DemoReview = {
  id: string;
  taskId: string;
  reviewer: string;
  reviewee: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  publishAt: string;
  publishedAt: string | null;
};

export type DemoReviewResult =
  | {
      ok: true;
      reviews: DemoReview[];
      review: DemoReview;
      published: boolean;
    }
  | { ok: false; reason: string };

export function submitDemoReview(input: {
  reviews: readonly DemoReview[];
  taskId: string;
  poster: string;
  tasker: string;
  reviewer: string;
  reviewee: string;
  rating: number;
  comment: string | null;
  unlockedAt: string;
  now?: Date;
}): DemoReviewResult {
  const now = input.now ?? new Date();
  const comment = input.comment?.trim() || null;
  const alreadyReviewed = input.reviews.some(
    (review) =>
      review.taskId === input.taskId && review.reviewer === input.reviewer,
  );

  const decision = canSubmitReview({
    actorId: input.reviewer,
    posterId: input.poster,
    taskerId: input.tasker,
    taskStatus: "completed",
    alreadyReviewed,
    rating: input.rating,
    comment,
  });

  if (!decision.allowed) return { ok: false, reason: decision.reason };

  const other = input.reviews.find(
    (review) =>
      review.taskId === input.taskId && review.reviewer === input.reviewee,
  );

  const publishAt = reviewPublishAt(new Date(input.unlockedAt));
  const due = publishAt.getTime() <= now.getTime();
  const publishNow = Boolean(other) || due;

  const review: DemoReview = {
    id: `review_${crypto.randomUUID()}`,
    taskId: input.taskId,
    reviewer: input.reviewer,
    reviewee: input.reviewee,
    rating: input.rating,
    comment,
    createdAt: now.toISOString(),
    publishAt: publishAt.toISOString(),
    publishedAt: publishNow ? now.toISOString() : null,
  };

  const reviews = input.reviews.map((item) =>
    publishNow && item.taskId === input.taskId && !item.publishedAt
      ? { ...item, publishedAt: now.toISOString() }
      : item,
  );

  return {
    ok: true,
    reviews: [...reviews, review],
    review,
    published: publishNow,
  };
}

/** Publishes a lone review once its 14-day window elapses. */
export function publishDueDemoReviews(
  reviews: readonly DemoReview[],
  now: Date = new Date(),
): { reviews: DemoReview[]; published: number } {
  let published = 0;
  const next = reviews.map((review) => {
    if (review.publishedAt || new Date(review.publishAt).getTime() > now.getTime()) {
      return review;
    }
    published += 1;
    return { ...review, publishedAt: now.toISOString() };
  });

  return { reviews: next, published };
}
