import { describe, expect, it } from "vitest";
import type { DemoAssignment } from "@/lib/payments/demo";
import type { TaskSummary } from "@/lib/tasks/types";
import {
  confirmDemoCompletion,
  disputeDemoCompletion,
  requestDemoCancellation,
  publishDueDemoReviews,
  releaseDemoCompletionIfDue,
  remindDemoCompletionIfDue,
  submitDemoCompletion,
  submitDemoReview,
  type DemoReview,
} from "./demo";

const now = new Date("2026-10-27T08:00:00.000Z");

function task(overrides: Partial<TaskSummary> = {}): TaskSummary {
  return {
    id: "task_1",
    title: "Pick up groceries",
    description: "Buy groceries.",
    category: "Delivery",
    fulfillmentMode: "local",
    hiringMode: "bidding",
    status: "assigned",
    budget: 450,
    location: "Sampaloc, Manila",
    deadline: "2026-10-30T09:00:00.000Z",
    poster: "Maria Santos",
    applications: 1,
    ...overrides,
  };
}

function assignment(overrides: Partial<DemoAssignment> = {}): DemoAssignment {
  return {
    id: "assignment_1",
    taskId: "task_1",
    tasker: "Ana Reyes",
    applicationId: "application_1",
    status: "active",
    selectedAt: "2026-10-26T09:00:00.000Z",
    holdExpiresAt: "2026-10-27T09:00:00.000Z",
    amountCents: 45000,
    platformFeeCents: 2250,
    payoutCents: 42750,
    paymentStatus: "paid",
    attemptCount: 1,
    lastError: null,
    paidAt: "2026-10-26T09:05:00.000Z",
    ...overrides,
  };
}

describe("demo completion evidence", () => {
  it("requires a local note and a remote deliverable", () => {
    expect(
      submitDemoCompletion({ assignment: assignment(), task: task(), actor: "Ana Reyes", note: "  ", url: null, now }),
    ).toMatchObject({ ok: false });
    expect(
      submitDemoCompletion({
        assignment: assignment(),
        task: task({ fulfillmentMode: "remote" }),
        actor: "Ana Reyes",
        note: "Sent the file.",
        url: null,
        now,
      }),
    ).toMatchObject({ ok: false });
    expect(
      submitDemoCompletion({
        assignment: assignment(),
        task: task({ fulfillmentMode: "remote" }),
        actor: "Ana Reyes",
        note: null,
        url: "https://files.test/deliverable.zip",
        now,
      }).ok,
    ).toBe(true);
  });

  it("starts the 48-hour confirmation clock on submission", () => {
    const result = submitDemoCompletion({
      assignment: assignment(),
      task: task(),
      actor: "Ana Reyes",
      note: "Groceries delivered.",
      url: "https://files.test/receipt.jpg",
      now,
    });

    expect(result).toMatchObject({
      ok: true,
      assignment: {
        completedAt: now.toISOString(),
        completionNote: "Groceries delivered.",
        completionUrl: "https://files.test/receipt.jpg",
        autoReleaseAt: "2026-10-29T08:00:00.000Z",
        reminderSentAt: null,
      },
    });
  });
});

describe("demo cancellation", () => {
  it("pauses work and payout for either participant", () => {
    const result = requestDemoCancellation({
      assignment: assignment(),
      task: task(),
      actor: "Ana Reyes",
      reason: "The agreed scope changed after hire.",
      now,
    });

    expect(result).toMatchObject({
      ok: true,
      assignment: {
        status: "cancellation_review",
        cancellation: {
          requestedBy: "Ana Reyes",
          reviewDueAt: "2026-10-29T08:00:00.000Z",
        },
      },
    });
  });

  it("refuses a released payout or a second request", () => {
    expect(
      requestDemoCancellation({
        assignment: assignment({ payoutReleasedAt: now.toISOString() }),
        task: task(),
        actor: "Maria Santos",
        reason: "The work was incomplete.",
        now,
      }),
    ).toMatchObject({ ok: false });
    expect(
      requestDemoCancellation({
        assignment: assignment({
          cancellation: {
            reason: "Open",
            requestedBy: "Maria Santos",
            requestedAt: now.toISOString(),
            reviewDueAt: now.toISOString(),
          },
        }),
        task: task(),
        actor: "Maria Santos",
        reason: "The work was incomplete.",
        now,
      }),
    ).toMatchObject({ ok: false });
  });
});

describe("demo confirmation and disputes", () => {
  it("releases the payout only after evidence and without a dispute", () => {
    const submitted = assignment({
      completedAt: "2026-10-27T08:00:00.000Z",
      autoReleaseAt: "2026-10-29T08:00:00.000Z",
    });

    expect(confirmDemoCompletion({ assignment: submitted, task: task(), actor: "Maria Santos", now })).toMatchObject({
      ok: true,
      assignment: {
        status: "completed",
        confirmedAt: now.toISOString(),
        payoutReleasedAt: now.toISOString(),
      },
    });
    expect(
      confirmDemoCompletion({ assignment: assignment(), task: task(), actor: "Maria Santos", now }),
    ).toMatchObject({ ok: false });
    expect(
      confirmDemoCompletion({
        assignment: { ...submitted, dispute: { reason: "x", openedBy: "Ana Reyes", openedAt: now.toISOString() } },
        task: task(),
        actor: "Maria Santos",
        now,
      }),
    ).toMatchObject({ ok: false });
  });

  it("freezes the payout when either participant disputes", () => {
    const submitted = assignment({
      completedAt: "2026-10-27T08:00:00.000Z",
      autoReleaseAt: "2026-10-29T08:00:00.000Z",
    });

    const result = disputeDemoCompletion({
      assignment: submitted,
      task: task(),
      actor: "Ana Reyes",
      reason: "The agreed scope changed.",
      now,
    });

    expect(result).toMatchObject({
      ok: true,
      assignment: {
        status: "disputed",
        dispute: { openedBy: "Ana Reyes", reason: "The agreed scope changed." },
        payoutReleasedAt: null,
      },
    });
    expect(
      confirmDemoCompletion({
        assignment: result.ok ? result.assignment : submitted,
        task: task(),
        actor: "Maria Santos",
        now,
      }),
    ).toMatchObject({ ok: false });
  });

  it("sends one reminder at 24 hours and releases at 48", () => {
    const submitted = assignment({
      completedAt: "2026-10-27T08:00:00.000Z",
      autoReleaseAt: "2026-10-29T08:00:00.000Z",
    });

    const early = remindDemoCompletionIfDue(submitted, new Date("2026-10-28T07:59:00.000Z"));
    expect(early.reminded).toBe(false);

    const reminder = remindDemoCompletionIfDue(submitted, new Date("2026-10-28T08:00:00.000Z"));
    expect(reminder.reminded).toBe(true);
    expect(reminder.assignment.reminderSentAt).toBe("2026-10-28T08:00:00.000Z");
    expect(
      remindDemoCompletionIfDue(reminder.assignment, new Date("2026-10-28T09:00:00.000Z")).reminded,
    ).toBe(false);

    const notYet = releaseDemoCompletionIfDue(submitted, new Date("2026-10-29T07:59:00.000Z"));
    expect(notYet.released).toBe(false);
    const released = releaseDemoCompletionIfDue(submitted, new Date("2026-10-29T08:00:00.000Z"));
    expect(released.released).toBe(true);
    expect(released.assignment.payoutReleasedAt).toBe("2026-10-29T08:00:00.000Z");
  });

  it("lets either party dispute before completion is submitted", () => {
    const result = disputeDemoCompletion({
      assignment: assignment(),
      task: task(),
      actor: "Maria Santos",
      reason: "The Tasker has not started.",
      now,
    });

    expect(result).toMatchObject({ ok: true, assignment: { status: "disputed" } });
  });

  it("never auto-releases a disputed payout", () => {
    const disputed = assignment({
      status: "disputed",
      completedAt: "2026-10-27T08:00:00.000Z",
      autoReleaseAt: "2026-10-29T08:00:00.000Z",
      dispute: { reason: "Scope", openedBy: "Ana Reyes", openedAt: now.toISOString() },
    });

    expect(
      releaseDemoCompletionIfDue(disputed, new Date("2026-11-01T08:00:00.000Z")).released,
    ).toBe(false);
  });
});

describe("demo blind reviews", () => {
  function review(overrides: Partial<DemoReview> = {}): DemoReview {
    return {
      id: "review_1",
      taskId: "task_1",
      reviewer: "Maria Santos",
      reviewee: "Ana Reyes",
      rating: 5,
      comment: "Reliable.",
      createdAt: "2026-10-27T08:00:00.000Z",
      publishAt: "2026-11-10T08:00:00.000Z",
      publishedAt: null,
      ...overrides,
    };
  }

  it("hides the first review and publishes both when the second arrives", () => {
    const first = submitDemoReview({
      reviews: [],
      taskId: "task_1",
      poster: "Maria Santos",
      tasker: "Ana Reyes",
      reviewer: "Maria Santos",
      reviewee: "Ana Reyes",
      rating: 5,
      comment: "Reliable.",
      unlockedAt: "2026-10-27T08:00:00.000Z",
      now,
    });

    expect(first).toMatchObject({ ok: true, published: false });
    if (!first.ok) return;
    expect(first.reviews[0].publishedAt).toBeNull();

    const second = submitDemoReview({
      reviews: first.reviews,
      taskId: "task_1",
      poster: "Maria Santos",
      tasker: "Ana Reyes",
      reviewer: "Ana Reyes",
      reviewee: "Maria Santos",
      rating: 4,
      comment: "Clear instructions.",
      unlockedAt: "2026-10-27T08:00:00.000Z",
      now,
    });

    expect(second).toMatchObject({ ok: true, published: true });
    if (!second.ok) return;
    expect(second.reviews.every((item) => item.publishedAt === now.toISOString())).toBe(true);
  });

  it("publishes immediately when the window already passed", () => {
    const result = submitDemoReview({
      reviews: [],
      taskId: "task_1",
      poster: "Maria Santos",
      tasker: "Ana Reyes",
      reviewer: "Maria Santos",
      reviewee: "Ana Reyes",
      rating: 5,
      comment: "Reliable.",
      unlockedAt: "2026-10-01T08:00:00.000Z",
      now,
    });

    expect(result).toMatchObject({ ok: true, published: true });
  });

  it("publishes a lone review after the 14-day window", () => {
    const pending = publishDueDemoReviews(
      [review()],
      new Date("2026-11-10T07:59:00.000Z"),
    );
    expect(pending.published).toBe(0);
    expect(pending.reviews[0].publishedAt).toBeNull();

    const due = publishDueDemoReviews([review()], new Date("2026-11-10T08:00:00.000Z"));
    expect(due.published).toBe(1);
    expect(due.reviews[0].publishedAt).toBe("2026-11-10T08:00:00.000Z");
  });
});
