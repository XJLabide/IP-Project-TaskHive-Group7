import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notifications";
import { isUniqueViolation } from "@/lib/db/errors";
import { reviewDueAt } from "@/lib/support/rules";
import { toDomainFulfillment, toDomainTaskStatus } from "@/lib/tasks/mapping";
import {
  autoReleaseAt,
  canConfirmCompletion,
  canOpenDispute,
  canSubmitCompletion,
  canSubmitReview,
  evidenceError,
  reminderCutoff,
  reviewPublishAt,
  type CompletionRuleCode,
} from "./rules";

export type CompletionFailureCode =
  | CompletionRuleCode
  | "not_found"
  | "evidence_required"
  | "invalid_reason"
  | "payout_missing";

export type CompletionFailure = {
  ok: false;
  code: CompletionFailureCode;
  reason: string;
};

export type SubmitCompletionResult =
  | {
      ok: true;
      taskId: string;
      autoReleaseAt: Date;
      taskStatus: "awaiting_confirmation";
    }
  | CompletionFailure;

export type ConfirmCompletionResult =
  | {
      ok: true;
      taskId: string;
      releasedAt: Date | null;
      alreadyReleased: boolean;
    }
  | CompletionFailure;

export type DisputeResult =
  | { ok: true; disputeId: string; taskId: string }
  | CompletionFailure;

export type ReminderResult = { reminded: number };
export type ReleaseResult = { released: number };
export type PublishReviewsResult = { published: number };

export type SubmitReviewResult =
  | {
      ok: true;
      reviewId: string;
      published: boolean;
      publishAt: Date | null;
    }
  | CompletionFailure;

export type ReviewOverview = {
  averageRating: number | null;
  opportunities: Array<{
    taskId: string;
    taskTitle: string;
    counterpart: string;
    role: "poster" | "tasker";
    publishAt: Date;
    otherSubmitted: boolean;
  }>;
  waiting: Array<{
    taskId: string;
    taskTitle: string;
    counterpart: string;
    role: "poster" | "tasker";
    publishAt: Date | null;
    otherSubmitted: boolean;
  }>;
  received: Array<{
    id: string;
    taskId: string;
    taskTitle: string;
    reviewer: string;
    rating: number;
    comment: string | null;
    publishedAt: Date | null;
  }>;
};

function failure(
  code: CompletionFailureCode,
  reason: string,
): CompletionFailure {
  return { ok: false, code, reason };
}

/**
 * Stores fulfillment evidence and starts the 48-hour confirmation clock.
 * Local work needs a note; remote work needs the deliverable link.
 */
export async function submitCompletion(input: {
  taskerId: string;
  taskId: string;
  note?: string | null;
  evidenceUrl?: string | null;
  now?: Date;
}): Promise<SubmitCompletionResult> {
  const now = input.now ?? new Date();
  const task = await prisma.task.findUnique({
    where: { id: input.taskId },
    select: {
      id: true,
      posterId: true,
      title: true,
      status: true,
      fulfillmentMode: true,
      assignment: {
        select: {
          taskerId: true,
          status: true,
          completedAt: true,
        },
      },
    },
  });

  if (!task || !task.assignment) {
    return failure("not_found", "Task or assignment not found.");
  }

  const decision = canSubmitCompletion({
    actorId: input.taskerId,
    taskerId: task.assignment.taskerId,
    taskStatus: toDomainTaskStatus[task.status],
    completedAt: task.assignment.completedAt,
  });

  if (!decision.allowed) return failure(decision.code, decision.reason);

  const note = input.note?.trim() || null;
  const evidenceUrl = input.evidenceUrl?.trim() || null;
  const problem = evidenceError(toDomainFulfillment[task.fulfillmentMode], {
    note,
    url: evidenceUrl,
  });

  if (problem) return failure("evidence_required", problem);

  const releaseAt = autoReleaseAt(now);
  const stored = await prisma.$transaction(async (tx) => {
    const updated = await tx.assignment.updateMany({
      where: { taskId: task.id, status: "ACTIVE", completedAt: null },
      data: {
        completedAt: now,
        completionNote: note,
        completionUrl: evidenceUrl,
        autoReleaseAt: releaseAt,
        reminderSentAt: null,
      },
    });

    if (updated.count === 0) return false;

    await tx.task.updateMany({
      where: { id: task.id, status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
      data: { status: "AWAITING_CONFIRMATION" },
    });

    return true;
  });

  if (!stored) {
    return failure("invalid_state", "This assignment is not ready for completion.");
  }

  await notifyUser({
    userId: task.posterId,
    type: "completion.submitted",
    title: `Completion submitted for “${task.title}”`,
    job: "notify.completion.submitted",
    jobBody: { taskId: task.id, taskerId: task.assignment.taskerId },
  });

  return {
    ok: true,
    taskId: task.id,
    autoReleaseAt: releaseAt,
    taskStatus: "awaiting_confirmation",
  };
}

/** The Poster releases the payout and completes the task. */
export async function confirmCompletion(input: {
  posterId: string;
  taskId: string;
  now?: Date;
}): Promise<ConfirmCompletionResult> {
  const now = input.now ?? new Date();
  const task = await prisma.task.findUnique({
    where: { id: input.taskId },
    select: {
      id: true,
      posterId: true,
      title: true,
      status: true,
      assignment: {
        select: { taskerId: true, completedAt: true, status: true },
      },
      payments: {
        select: { id: true, status: true },
        take: 1,
      },
      disputes: {
        where: { status: "OPEN" },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!task || !task.assignment) {
    return failure("not_found", "Task or assignment not found.");
  }

  const payment = task.payments[0] ?? null;
  const payout = payment
    ? await prisma.payout.findUnique({
        where: { paymentId: payment.id },
        select: { releasedAt: true },
      })
    : null;

  if (payment?.status === "RELEASED") {
    return {
      ok: true,
      taskId: task.id,
      releasedAt: null,
      alreadyReleased: true,
    };
  }

  if (payment && payment.status !== "PAID_PENDING_COMPLETION") {
    return failure("invalid_state", "This payment is not releasable.");
  }

  const decision = canConfirmCompletion({
    actorId: input.posterId,
    posterId: task.posterId,
    taskStatus: toDomainTaskStatus[task.status],
    completedAt: task.assignment.completedAt,
    payoutReleasedAt: payout?.releasedAt ?? null,
    openDispute: task.disputes.length > 0,
  });

  if (!decision.allowed) {
    if (decision.code === "already_released") {
      return {
        ok: true,
        taskId: task.id,
        releasedAt: null,
        alreadyReleased: true,
      };
    }
    return failure(decision.code, decision.reason);
  }

  if (!payment) {
    return failure("payout_missing", "This task has no payment to release.");
  }

  const released = await prisma.$transaction(async (tx) => {
    const paymentUpdate = await tx.payment.updateMany({
      where: { id: payment.id, status: "PAID_PENDING_COMPLETION" },
      data: { status: "RELEASED" },
    });

    if (paymentUpdate.count === 0) return false;

    const taskUpdate = await tx.task.updateMany({
      where: { id: task.id, status: "AWAITING_CONFIRMATION" },
      data: { status: "COMPLETED" },
    });

    if (taskUpdate.count === 0) return false;

    const payoutUpdate = await tx.payout.updateMany({
      where: { paymentId: payment.id, releasedAt: null },
      data: { releasedAt: now },
    });

    if (payoutUpdate.count === 0) return false;

    await tx.assignment.updateMany({
      where: { taskId: task.id, status: "ACTIVE" },
      data: { status: "COMPLETED", confirmedAt: now },
    });

    return true;
  });

  if (!released) {
    return failure("invalid_state", "The payment or task state changed before release.");
  }

  await notifyUser({
    userId: task.assignment.taskerId,
    type: "completion.confirmed",
    title: `Payout released for “${task.title}”`,
    job: "notify.payment.released",
    jobBody: { taskId: task.id },
  });

  return {
    ok: true,
    taskId: task.id,
    releasedAt: now,
    alreadyReleased: false,
  };
}

/** Either participant can freeze the payout by opening a dispute. */
export async function disputeCompletion(input: {
  actorId: string;
  taskId: string;
  reason: string;
  now?: Date;
}): Promise<DisputeResult> {
  const now = input.now ?? new Date();
  const reason = input.reason.trim();
  if (!reason) return failure("invalid_reason", "Explain the dispute before opening it.");

  const task = await prisma.task.findUnique({
    where: { id: input.taskId },
    select: {
      id: true,
      posterId: true,
      title: true,
      status: true,
      assignment: {
        select: { taskerId: true, completedAt: true, status: true },
      },
      payments: { select: { id: true }, take: 1 },
      disputes: {
        where: { status: "OPEN" },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!task || !task.assignment) {
    return failure("not_found", "Task or assignment not found.");
  }

  const payment = task.payments[0] ?? null;
  const payout = payment
    ? await prisma.payout.findUnique({
        where: { paymentId: payment.id },
        select: { releasedAt: true },
      })
    : null;

  const decision = canOpenDispute({
    actorId: input.actorId,
    posterId: task.posterId,
    taskerId: task.assignment.taskerId,
    taskStatus: toDomainTaskStatus[task.status],
    payoutReleasedAt: payout?.releasedAt ?? null,
    openDispute: task.disputes.length > 0,
  });

  if (!decision.allowed) return failure(decision.code, decision.reason);

  const dispute = await prisma.$transaction(async (tx) => {
    const taskUpdate = await tx.task.updateMany({
      where: { id: task.id, status: "AWAITING_CONFIRMATION" },
      data: { status: "DISPUTED" },
    });

    if (taskUpdate.count === 0) return null;

    const created = await tx.dispute.create({
      data: {
        taskId: task.id,
        openedById: input.actorId,
        reason,
        reviewDueAt: reviewDueAt(now),
        createdAt: now,
      },
      select: { id: true },
    });

    await tx.assignment.updateMany({
      where: { taskId: task.id, status: "ACTIVE" },
      data: { status: "DISPUTED" },
    });

    if (payment) {
      await tx.payment.updateMany({
        where: { id: payment.id, status: { not: "REFUNDED" } },
        data: { status: "DISPUTED" },
      });
    }

    return created;
  });

  if (!dispute) {
    return failure("invalid_state", "This task is no longer awaiting confirmation.");
  }

  const otherParticipant =
    input.actorId === task.posterId
      ? task.assignment.taskerId
      : task.posterId;

  await notifyUser({
    userId: otherParticipant,
    type: "completion.disputed",
    title: `A dispute froze payout for “${task.title}”`,
    job: "notify.completion.disputed",
    jobBody: { taskId: task.id, disputeId: dispute.id },
  });

  return { ok: true, disputeId: dispute.id, taskId: task.id };
}

/** Sends the single 24-hour Poster reminder and records it. */
export async function sendCompletionReminders(input: {
  now?: Date;
} = {}): Promise<ReminderResult> {
  const now = input.now ?? new Date();
  const cutoff = reminderCutoff(now);

  const due = await prisma.assignment.findMany({
    where: {
      status: "ACTIVE",
      reminderSentAt: null,
      completedAt: { lte: cutoff },
      task: {
        status: "AWAITING_CONFIRMATION",
        disputes: { none: { status: "OPEN" } },
      },
    },
    select: {
      id: true,
      taskId: true,
      taskerId: true,
      task: { select: { posterId: true, title: true } },
    },
  });

  let reminded = 0;
  for (const assignment of due) {
    const marked = await prisma.assignment.updateMany({
      where: { id: assignment.id, reminderSentAt: null },
      data: { reminderSentAt: now },
    });

    if (marked.count === 0) continue;
    reminded += 1;

    try {
      await notifyUser({
        userId: assignment.task.posterId,
        type: "completion.reminder",
        title: `Confirm completion for “${assignment.task.title}”`,
        job: "notify.completion.reminder",
        jobBody: { taskId: assignment.taskId, taskerId: assignment.taskerId },
      });
    } catch {
      // Leave the reminder eligible so the next run can retry the one send.
      await prisma.assignment.updateMany({
        where: { id: assignment.id, reminderSentAt: now },
        data: { reminderSentAt: null },
      });
      reminded -= 1;
    }
  }

  return { reminded };
}

/** Releases undisputed payouts 48 hours after completion was submitted. */
export async function autoReleaseCompletions(input: {
  now?: Date;
} = {}): Promise<ReleaseResult> {
  const now = input.now ?? new Date();

  const due = await prisma.assignment.findMany({
    where: {
      status: "ACTIVE",
      completedAt: { not: null },
      autoReleaseAt: { lte: now },
      task: {
        status: "AWAITING_CONFIRMATION",
        disputes: { none: { status: "OPEN" } },
      },
    },
    select: {
      id: true,
      taskId: true,
      taskerId: true,
      task: {
        select: {
          posterId: true,
          title: true,
          payments: { select: { id: true }, take: 1 },
        },
      },
    },
  });

  let released = 0;
  for (const assignment of due) {
    const payment = assignment.task.payments[0];
    if (!payment) continue;

    const didRelease = await prisma.$transaction(async (tx) => {
      const openDispute = await tx.dispute.findFirst({
        where: { taskId: assignment.taskId, status: "OPEN" },
        select: { id: true },
      });

      if (openDispute) return false;

      const paymentUpdate = await tx.payment.updateMany({
        where: { id: payment.id, status: "PAID_PENDING_COMPLETION" },
        data: { status: "RELEASED" },
      });

      if (paymentUpdate.count === 0) return false;

      const taskUpdate = await tx.task.updateMany({
        where: { id: assignment.taskId, status: "AWAITING_CONFIRMATION" },
        data: { status: "COMPLETED" },
      });

      if (taskUpdate.count === 0) return false;

      const payoutUpdate = await tx.payout.updateMany({
        where: { paymentId: payment.id, releasedAt: null },
        data: { releasedAt: now },
      });

      if (payoutUpdate.count === 0) return false;

      await tx.assignment.updateMany({
        where: { id: assignment.id, status: "ACTIVE" },
        data: { status: "COMPLETED", confirmedAt: now },
      });

      return true;
    });

    if (!didRelease) continue;
    released += 1;

    await notifyUser({
      userId: assignment.task.posterId,
      type: "completion.auto_released",
      title: `Payout auto-released for “${assignment.task.title}”`,
      job: "notify.completion.auto_released",
      jobBody: { taskId: assignment.taskId },
    });
    await notifyUser({
      userId: assignment.taskerId,
      type: "completion.auto_released",
      title: `Payout auto-released for “${assignment.task.title}”`,
      job: "notify.completion.auto_released",
      jobBody: { taskId: assignment.taskId },
    });
  }

  return { released };
}

/** Stores a blind review and publishes both once each participant has one. */
export async function submitReview(input: {
  reviewerId: string;
  taskId: string;
  rating: number;
  comment?: string | null;
  now?: Date;
}): Promise<SubmitReviewResult> {
  const now = input.now ?? new Date();
  const task = await prisma.task.findUnique({
    where: { id: input.taskId },
    select: {
      id: true,
      posterId: true,
      title: true,
      status: true,
      assignment: {
        select: { taskerId: true, completedAt: true, confirmedAt: true },
      },
      reviews: {
        where: { reviewerId: input.reviewerId },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!task || !task.assignment) {
    return failure("not_found", "Task or assignment not found.");
  }

  const comment = input.comment?.trim() || null;
  const decision = canSubmitReview({
    actorId: input.reviewerId,
    posterId: task.posterId,
    taskerId: task.assignment.taskerId,
    taskStatus: toDomainTaskStatus[task.status],
    alreadyReviewed: task.reviews.length > 0,
    rating: input.rating,
    comment,
  });

  if (!decision.allowed) return failure(decision.code, decision.reason);

  const revieweeId =
    input.reviewerId === task.posterId
      ? task.assignment.taskerId
      : task.posterId;
  const unlockedAt =
    task.assignment.confirmedAt ?? task.assignment.completedAt ?? now;
  const publishAt = reviewPublishAt(unlockedAt);

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          taskId: task.id,
          reviewerId: input.reviewerId,
          revieweeId,
          rating: input.rating,
          comment,
          publishAt,
        },
        select: { id: true },
      });

      const other = await tx.review.findFirst({
        where: { taskId: task.id, reviewerId: revieweeId },
        select: { id: true },
      });

      if (other) {
        await tx.review.updateMany({
          where: { taskId: task.id, publishedAt: null },
          data: { publishedAt: now },
        });
      }

      return { reviewId: review.id, published: Boolean(other) };
    });

    return {
      ok: true,
      ...outcome,
      publishAt: outcome.published ? now : publishAt,
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return failure("already_reviewed", "You already reviewed this task.");
    }
    throw error;
  }
}

/** Reveals reviews whose 14-day blind window has elapsed. */
export async function publishDueReviews(input: {
  now?: Date;
} = {}): Promise<PublishReviewsResult> {
  const now = input.now ?? new Date();
  const result = await prisma.review.updateMany({
    where: { publishedAt: null, publishAt: { lte: now } },
    data: { publishedAt: now },
  });

  return { published: result.count };
}

/** Everything the Reviews page needs, scoped to one participant. */
export async function getReviewOverview(
  userId: string,
): Promise<ReviewOverview> {
  const tasks = await prisma.task.findMany({
    where: {
      status: "COMPLETED",
      OR: [{ posterId: userId }, { assignment: { taskerId: userId } }],
    },
    select: {
      id: true,
      title: true,
      posterId: true,
      poster: { select: { name: true } },
      assignment: {
        select: {
          taskerId: true,
          completedAt: true,
          confirmedAt: true,
          tasker: { select: { name: true } },
        },
      },
      reviews: {
        select: {
          id: true,
          reviewerId: true,
          publishAt: true,
          publishedAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const opportunities: ReviewOverview["opportunities"] = [];
  const waiting: ReviewOverview["waiting"] = [];

  for (const task of tasks) {
    if (!task.assignment) continue;
    const unlockedAt =
      task.assignment.confirmedAt ?? task.assignment.completedAt;
    if (!unlockedAt) continue;

    const isPoster = task.posterId === userId;
    const counterpart = isPoster
      ? task.assignment.tasker.name
      : task.poster.name;
    const role = isPoster ? ("poster" as const) : ("tasker" as const);
    const mine = task.reviews.find((review) => review.reviewerId === userId);
    const other = task.reviews.find((review) => review.reviewerId !== userId);

    if (!mine) {
      opportunities.push({
        taskId: task.id,
        taskTitle: task.title,
        counterpart,
        role,
        publishAt: reviewPublishAt(unlockedAt),
        otherSubmitted: Boolean(other),
      });
      continue;
    }

    if (!mine.publishedAt) {
      waiting.push({
        taskId: task.id,
        taskTitle: task.title,
        counterpart,
        role,
        publishAt: mine.publishAt,
        otherSubmitted: Boolean(other),
      });
    }
  }

  const receivedRows = await prisma.review.findMany({
    where: { revieweeId: userId, publishedAt: { not: null } },
    select: {
      id: true,
      rating: true,
      comment: true,
      publishedAt: true,
      task: { select: { id: true, title: true } },
      reviewer: { select: { name: true } },
    },
    orderBy: { publishedAt: "desc" },
  });

  const received = receivedRows.map((review) => ({
    id: review.id,
    taskId: review.task.id,
    taskTitle: review.task.title,
    reviewer: review.reviewer.name,
    rating: review.rating,
    comment: review.comment,
    publishedAt: review.publishedAt,
  }));

  const averageRating =
    received.length === 0
      ? null
      : Math.round(
          (received.reduce((sum, review) => sum + review.rating, 0) /
            received.length) *
            10,
        ) / 10;

  return { averageRating, opportunities, waiting, received };
}
