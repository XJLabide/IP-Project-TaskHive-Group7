import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, txMock, notifyUserMock } = vi.hoisted(() => {
  const txMock = {
    task: { updateMany: vi.fn() },
    assignment: { updateMany: vi.fn() },
    payment: { updateMany: vi.fn() },
    payout: { updateMany: vi.fn() },
    dispute: { create: vi.fn(), findFirst: vi.fn() },
    review: { create: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() },
  };

  const prismaMock = {
    task: { findUnique: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
    assignment: { findMany: vi.fn(), updateMany: vi.fn() },
    payout: { findUnique: vi.fn(), updateMany: vi.fn() },
    payment: { updateMany: vi.fn() },
    dispute: { create: vi.fn() },
    review: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  return { prismaMock, txMock, notifyUserMock: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/notifications", () => ({ notifyUser: notifyUserMock }));

import {
  autoReleaseCompletions,
  confirmCompletion,
  disputeCompletion,
  getReviewOverview,
  publishDueReviews,
  sendCompletionReminders,
  submitCompletion,
  submitReview,
} from "./service";

const now = new Date("2026-10-27T08:00:00.000Z");
const submittedAt = new Date("2026-10-26T08:00:00.000Z");

const activeTask = {
  id: "task_1",
  posterId: "poster_1",
  title: "Pick up groceries",
  status: "ASSIGNED" as const,
  fulfillmentMode: "LOCAL" as const,
  assignment: {
    taskerId: "tasker_1",
    status: "ACTIVE" as const,
    completedAt: null,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(
    async (callback: (tx: typeof txMock) => unknown) => callback(txMock),
  );
  txMock.assignment.updateMany.mockResolvedValue({ count: 1 });
  txMock.task.updateMany.mockResolvedValue({ count: 1 });
  txMock.payment.updateMany.mockResolvedValue({ count: 1 });
  txMock.payout.updateMany.mockResolvedValue({ count: 1 });
  txMock.dispute.findFirst.mockResolvedValue(null);
});

describe("submitting completion", () => {
  it("requires local evidence before changing any record", async () => {
    prismaMock.task.findUnique.mockResolvedValue(activeTask);

    const result = await submitCompletion({
      taskerId: "tasker_1",
      taskId: "task_1",
      note: "   ",
      now,
    });

    expect(result).toMatchObject({ ok: false, code: "evidence_required" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("stores local evidence and starts the 48-hour clock", async () => {
    prismaMock.task.findUnique.mockResolvedValue(activeTask);

    const result = await submitCompletion({
      taskerId: "tasker_1",
      taskId: "task_1",
      note: "Groceries delivered with the receipt attached.",
      evidenceUrl: "https://files.test/receipt.jpg",
      now,
    });

    expect(result).toMatchObject({
      ok: true,
      taskId: "task_1",
      taskStatus: "awaiting_confirmation",
    });
    expect(txMock.assignment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { taskId: "task_1", status: "ACTIVE", completedAt: null },
        data: expect.objectContaining({
          completedAt: now,
          completionNote: "Groceries delivered with the receipt attached.",
          completionUrl: "https://files.test/receipt.jpg",
          autoReleaseAt: new Date("2026-10-29T08:00:00.000Z"),
        }),
      }),
    );
    expect(txMock.task.updateMany).toHaveBeenCalledWith({
      where: { id: "task_1", status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
      data: { status: "AWAITING_CONFIRMATION" },
    });
    expect(notifyUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "poster_1", type: "completion.submitted" }),
    );
  });

  it("accepts a remote deliverable without a note", async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      ...activeTask,
      fulfillmentMode: "REMOTE",
    });

    const result = await submitCompletion({
      taskerId: "tasker_1",
      taskId: "task_1",
      evidenceUrl: "https://files.test/deliverable.zip",
      now,
    });

    expect(result.ok).toBe(true);
    expect(txMock.assignment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          completionNote: null,
          completionUrl: "https://files.test/deliverable.zip",
        }),
      }),
    );
  });
});

describe("confirming completion", () => {
  const submittedTask = {
    ...activeTask,
    status: "AWAITING_CONFIRMATION" as const,
    assignment: {
      taskerId: "tasker_1",
      status: "ACTIVE" as const,
      completedAt: submittedAt,
    },
    payments: [{ id: "payment_1", status: "PAID_PENDING_COMPLETION" }],
    disputes: [],
  };

  it("releases the payout and completes the task", async () => {
    prismaMock.task.findUnique.mockResolvedValue(submittedTask);
    prismaMock.payout.findUnique.mockResolvedValue({ releasedAt: null });

    const result = await confirmCompletion({
      posterId: "poster_1",
      taskId: "task_1",
      now,
    });

    expect(result).toMatchObject({ ok: true, alreadyReleased: false });
    expect(txMock.payout.updateMany).toHaveBeenCalledWith({
      where: { paymentId: "payment_1", releasedAt: null },
      data: { releasedAt: now },
    });
    expect(txMock.payment.updateMany).toHaveBeenCalledWith({
      where: { id: "payment_1", status: "PAID_PENDING_COMPLETION" },
      data: { status: "RELEASED" },
    });
    expect(txMock.task.updateMany).toHaveBeenCalledWith({
      where: { id: "task_1", status: "AWAITING_CONFIRMATION" },
      data: { status: "COMPLETED" },
    });
    expect(notifyUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "tasker_1", type: "completion.confirmed" }),
    );
  });

  it("refuses to release a refunded payment", async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      ...submittedTask,
      payments: [{ id: "payment_1", status: "REFUNDED" }],
    });

    const result = await confirmCompletion({
      posterId: "poster_1",
      taskId: "task_1",
      now,
    });

    expect(result).toMatchObject({ ok: false, code: "invalid_state" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("freezes release while a dispute is open", async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      ...submittedTask,
      disputes: [{ id: "dispute_1" }],
    });
    prismaMock.payout.findUnique.mockResolvedValue({ releasedAt: null });

    const result = await confirmCompletion({
      posterId: "poster_1",
      taskId: "task_1",
      now,
    });

    expect(result).toMatchObject({ ok: false, code: "dispute_open" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

describe("disputing completion", () => {
  it("freezes the payout and flags the task for review", async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      ...activeTask,
      status: "AWAITING_CONFIRMATION",
      assignment: {
        taskerId: "tasker_1",
        status: "ACTIVE",
        completedAt: submittedAt,
      },
      payments: [{ id: "payment_1" }],
      disputes: [],
    });
    prismaMock.payout.findUnique.mockResolvedValue({ releasedAt: null });
    txMock.dispute.create.mockResolvedValue({ id: "dispute_1" });

    const result = await disputeCompletion({
      actorId: "tasker_1",
      taskId: "task_1",
      reason: "The agreed scope was reduced after delivery.",
      now,
    });

    expect(result).toMatchObject({ ok: true, disputeId: "dispute_1" });
    expect(txMock.task.updateMany).toHaveBeenCalledWith({
      where: { id: "task_1", status: "AWAITING_CONFIRMATION" },
      data: { status: "DISPUTED" },
    });
    expect(txMock.payment.updateMany).toHaveBeenCalledWith({
      where: { id: "payment_1", status: { not: "REFUNDED" } },
      data: { status: "DISPUTED" },
    });
    expect(notifyUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "poster_1", type: "completion.disputed" }),
    );
  });

  it("does not create a second dispute when the task already moved on", async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      ...activeTask,
      status: "AWAITING_CONFIRMATION",
      assignment: {
        taskerId: "tasker_1",
        status: "ACTIVE",
        completedAt: submittedAt,
      },
      payments: [{ id: "payment_1" }],
      disputes: [],
    });
    prismaMock.payout.findUnique.mockResolvedValue({ releasedAt: null });
    txMock.task.updateMany.mockResolvedValue({ count: 0 });

    const result = await disputeCompletion({
      actorId: "tasker_1",
      taskId: "task_1",
      reason: "Work was incomplete.",
      now,
    });

    expect(result).toMatchObject({ ok: false, code: "invalid_state" });
    expect(txMock.dispute.create).not.toHaveBeenCalled();
    expect(notifyUserMock).not.toHaveBeenCalled();
  });

  it("refuses a dispute after the payout was released", async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      ...activeTask,
      status: "AWAITING_CONFIRMATION",
      assignment: {
        taskerId: "tasker_1",
        status: "ACTIVE",
        completedAt: submittedAt,
      },
      payments: [{ id: "payment_1" }],
      disputes: [],
    });
    prismaMock.payout.findUnique.mockResolvedValue({ releasedAt: submittedAt });

    const result = await disputeCompletion({
      actorId: "poster_1",
      taskId: "task_1",
      reason: "Work was incomplete.",
      now,
    });

    expect(result).toMatchObject({ ok: false, code: "already_released" });
  });
});

describe("completion timers", () => {
  it("sends the 24-hour reminder once", async () => {
    prismaMock.assignment.findMany.mockResolvedValue([
      {
        id: "assignment_1",
        taskId: "task_1",
        taskerId: "tasker_1",
        task: { posterId: "poster_1", title: "Pick up groceries" },
      },
    ]);
    prismaMock.assignment.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const first = await sendCompletionReminders({ now });
    const second = await sendCompletionReminders({ now });

    expect(first).toEqual({ reminded: 1 });
    expect(second).toEqual({ reminded: 0 });
    expect(notifyUserMock).toHaveBeenCalledTimes(1);
    expect(prismaMock.assignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          completedAt: { lte: new Date("2026-10-26T08:00:00.000Z") },
          reminderSentAt: null,
        }),
      }),
    );
  });

  it("auto-releases only assignments without an open dispute", async () => {
    prismaMock.assignment.findMany.mockResolvedValue([
      {
        id: "assignment_1",
        taskId: "task_1",
        taskerId: "tasker_1",
        task: {
          posterId: "poster_1",
          title: "Pick up groceries",
          payments: [{ id: "payment_1" }],
        },
      },
    ]);

    const result = await autoReleaseCompletions({ now });

    expect(result).toEqual({ released: 1 });
    expect(txMock.payout.updateMany).toHaveBeenCalledWith({
      where: { paymentId: "payment_1", releasedAt: null },
      data: { releasedAt: now },
    });
    expect(notifyUserMock).toHaveBeenCalledTimes(2);
  });

  it("does not release while a dispute is still open", async () => {
    prismaMock.assignment.findMany.mockResolvedValue([
      {
        id: "assignment_1",
        taskId: "task_1",
        taskerId: "tasker_1",
        task: {
          posterId: "poster_1",
          title: "Pick up groceries",
          payments: [{ id: "payment_1" }],
        },
      },
    ]);
    txMock.dispute.findFirst.mockResolvedValue({ id: "dispute_1" });

    const result = await autoReleaseCompletions({ now });

    expect(result).toEqual({ released: 0 });
    expect(txMock.payout.updateMany).not.toHaveBeenCalled();
    expect(notifyUserMock).not.toHaveBeenCalled();
  });

  it("skips a payout that was already released", async () => {
    prismaMock.assignment.findMany.mockResolvedValue([
      {
        id: "assignment_1",
        taskId: "task_1",
        taskerId: "tasker_1",
        task: {
          posterId: "poster_1",
          title: "Pick up groceries",
          payments: [{ id: "payment_1" }],
        },
      },
    ]);
    txMock.payout.updateMany.mockResolvedValue({ count: 0 });

    const result = await autoReleaseCompletions({ now });

    expect(result).toEqual({ released: 0 });
    expect(notifyUserMock).not.toHaveBeenCalled();
  });
});

describe("reviews", () => {
  const completedTask = {
    ...activeTask,
    status: "COMPLETED" as const,
    assignment: {
      taskerId: "tasker_1",
      status: "COMPLETED" as const,
    },
    reviews: [],
  };

  it("blocks reviews before completion", async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      ...completedTask,
      status: "AWAITING_CONFIRMATION",
    });

    const result = await submitReview({
      reviewerId: "poster_1",
      taskId: "task_1",
      rating: 5,
      now,
    });

    expect(result).toMatchObject({ ok: false, code: "not_unlocked" });
  });

  it("hides the first review until the other participant submits", async () => {
    prismaMock.task.findUnique.mockResolvedValue(completedTask);
    txMock.review.create.mockResolvedValue({ id: "review_1" });
    txMock.review.findFirst.mockResolvedValue(null);

    const result = await submitReview({
      reviewerId: "poster_1",
      taskId: "task_1",
      rating: 5,
      comment: "Clear work.",
      now,
    });

    expect(result).toMatchObject({ ok: true, published: false });
    expect(txMock.review.updateMany).not.toHaveBeenCalled();
  });

  it("turns a duplicate submission into a coded failure", async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      ...completedTask,
      assignment: { ...completedTask.assignment, completedAt: submittedAt },
    });
    txMock.review.create.mockRejectedValue({ code: "P2002" });

    const result = await submitReview({
      reviewerId: "poster_1",
      taskId: "task_1",
      rating: 5,
      now,
    });

    expect(result).toMatchObject({ ok: false, code: "already_reviewed" });
  });

  it("publishes both reviews when the second one arrives", async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      ...completedTask,
      assignment: { ...completedTask.assignment, completedAt: submittedAt },
    });
    txMock.review.create.mockResolvedValue({ id: "review_2" });
    txMock.review.findFirst.mockResolvedValue({ id: "review_1" });

    const result = await submitReview({
      reviewerId: "tasker_1",
      taskId: "task_1",
      rating: 4,
      now,
    });

    expect(result).toMatchObject({ ok: true, published: true });
    expect(txMock.review.updateMany).toHaveBeenCalledWith({
      where: { taskId: "task_1", publishedAt: null },
      data: { publishedAt: now },
    });
  });

  it("publishes reviews whose 14-day window elapsed", async () => {
    prismaMock.review.updateMany.mockResolvedValue({ count: 2 });

    const result = await publishDueReviews({ now });

    expect(result).toEqual({ published: 2 });
    expect(prismaMock.review.updateMany).toHaveBeenCalledWith({
      where: { publishedAt: null, publishAt: { lte: now } },
      data: { publishedAt: now },
    });
  });

  it("builds the review overview from completed tasks and published reviews", async () => {
    prismaMock.task.findMany.mockResolvedValue([
      {
        id: "task_1",
        title: "Pick up groceries",
        posterId: "poster_1",
        poster: { name: "Maria Santos" },
        assignment: {
          taskerId: "tasker_1",
          completedAt: submittedAt,
          tasker: { name: "Ana Reyes" },
        },
        reviews: [],
      },
    ]);
    prismaMock.review.findMany.mockResolvedValue([
      {
        id: "review_1",
        rating: 5,
        comment: "Reliable.",
        publishedAt: now,
        task: { id: "task_2", title: "Clean storage room" },
        reviewer: { name: "Jose Reyes" },
      },
    ]);

    const overview = await getReviewOverview("poster_1");

    expect(overview.averageRating).toBe(5);
    expect(overview.opportunities).toEqual([
      expect.objectContaining({
        taskId: "task_1",
        counterpart: "Ana Reyes",
        role: "poster",
        otherSubmitted: false,
      }),
    ]);
    expect(overview.received[0]).toMatchObject({
      reviewer: "Jose Reyes",
      taskTitle: "Clean storage room",
    });
  });
});
