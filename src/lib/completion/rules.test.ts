import { describe, expect, it } from "vitest";
import {
  autoReleaseAt,
  canConfirmCompletion,
  canOpenDispute,
  canSubmitCompletion,
  canSubmitReview,
  evidenceError,
  reminderAt,
  reminderCutoff,
  reviewPublishAt,
} from "./rules";

const submittedAt = new Date("2026-10-27T08:00:00.000Z");

describe("completion evidence", () => {
  it("requires a note for local work and keeps the photo optional", () => {
    expect(evidenceError("local", { note: "Done.", url: null })).toBeNull();
    expect(evidenceError("local", { note: "  ", url: "https://img.test/photo.jpg" })).toMatch(
      /note/i,
    );
  });

  it("requires the remote deliverable and does not need a separate note", () => {
    expect(
      evidenceError("remote", { note: null, url: "https://files.test/deliverable.zip" }),
    ).toBeNull();
    expect(evidenceError("remote", { note: "Uploaded it.", url: null })).toMatch(
      /deliverable/i,
    );
  });
});

describe("completion timers", () => {
  it("reminds at 24 hours and releases at 48 hours", () => {
    expect(reminderAt(submittedAt).toISOString()).toBe("2026-10-28T08:00:00.000Z");
    expect(autoReleaseAt(submittedAt).toISOString()).toBe("2026-10-29T08:00:00.000Z");
    expect(reminderCutoff(submittedAt).toISOString()).toBe("2026-10-26T08:00:00.000Z");
  });

  it("closes the blind review window at 14 days", () => {
    expect(reviewPublishAt(submittedAt).toISOString()).toBe(
      "2026-11-10T08:00:00.000Z",
    );
  });
});

describe("submitting completion", () => {
  it("only lets the assigned Tasker submit once while the assignment is active", () => {
    expect(
      canSubmitCompletion({
        actorId: "tasker_1",
        taskerId: "tasker_1",
        taskStatus: "assigned",
        completedAt: null,
      }),
    ).toEqual({ allowed: true });

    expect(
      canSubmitCompletion({
        actorId: "poster_1",
        taskerId: "tasker_1",
        taskStatus: "assigned",
        completedAt: null,
      }),
    ).toMatchObject({ allowed: false, code: "not_tasker" });

    expect(
      canSubmitCompletion({
        actorId: "tasker_1",
        taskerId: "tasker_1",
        taskStatus: "completed",
        completedAt: null,
      }),
    ).toMatchObject({ allowed: false, code: "invalid_state" });

    expect(
      canSubmitCompletion({
        actorId: "tasker_1",
        taskerId: "tasker_1",
        taskStatus: "awaiting_confirmation",
        completedAt: submittedAt,
      }),
    ).toMatchObject({ allowed: false, code: "already_submitted" });
  });
});

describe("confirming completion", () => {
  const base = {
    actorId: "poster_1",
    posterId: "poster_1",
    taskStatus: "awaiting_confirmation" as const,
    completedAt: submittedAt,
    payoutReleasedAt: null,
    openDispute: false,
  };

  it("lets the Poster release only after evidence is submitted", () => {
    expect(canConfirmCompletion(base)).toEqual({ allowed: true });
    expect(
      canConfirmCompletion({ ...base, actorId: "tasker_1" }),
    ).toMatchObject({ allowed: false, code: "not_poster" });
    expect(
      canConfirmCompletion({ ...base, completedAt: null }),
    ).toMatchObject({ allowed: false, code: "not_submitted" });
  });

  it("blocks release when a dispute is open or the payout already left", () => {
    expect(
      canConfirmCompletion({ ...base, openDispute: true }),
    ).toMatchObject({ allowed: false, code: "dispute_open" });
    expect(
      canConfirmCompletion({ ...base, payoutReleasedAt: submittedAt }),
    ).toMatchObject({ allowed: false, code: "already_released" });
  });
});

describe("disputing completion", () => {
  const base = {
    actorId: "tasker_1",
    posterId: "poster_1",
    taskerId: "tasker_1",
    taskStatus: "awaiting_confirmation" as const,
    payoutReleasedAt: null,
    openDispute: false,
  };

  it("lets either participant dispute before payout release", () => {
    expect(canOpenDispute(base)).toEqual({ allowed: true });
    expect(
      canOpenDispute({ ...base, actorId: "poster_1", taskerId: "tasker_2" }),
    ).toEqual({ allowed: true });
    expect(
      canOpenDispute({ ...base, actorId: "stranger" }),
    ).toMatchObject({ allowed: false, code: "not_participant" });
  });

  it("allows a dispute before completion, but not after release or twice", () => {
    expect(
      canOpenDispute({ ...base, taskStatus: "assigned" }),
    ).toEqual({ allowed: true });
    expect(
      canOpenDispute({ ...base, payoutReleasedAt: submittedAt }),
    ).toMatchObject({ allowed: false, code: "already_released" });
    expect(
      canOpenDispute({ ...base, openDispute: true }),
    ).toMatchObject({ allowed: false, code: "already_disputed" });
  });
});

describe("review eligibility", () => {
  const base = {
    actorId: "poster_1",
    posterId: "poster_1",
    taskerId: "tasker_1",
    taskStatus: "completed" as const,
    alreadyReviewed: false,
    rating: 5,
    comment: "Clear instructions and quick confirmation.",
  };

  it("unlocks after completion for both participants only", () => {
    expect(canSubmitReview(base)).toEqual({ allowed: true });
    expect(
      canSubmitReview({ ...base, actorId: "tasker_1" }),
    ).toEqual({ allowed: true });
    expect(
      canSubmitReview({ ...base, actorId: "stranger" }),
    ).toMatchObject({ allowed: false, code: "not_participant" });
    expect(
      canSubmitReview({ ...base, taskStatus: "awaiting_confirmation" }),
    ).toMatchObject({ allowed: false, code: "not_unlocked" });
  });

  it("requires one review per participant with a 1-5 rating", () => {
    expect(
      canSubmitReview({ ...base, alreadyReviewed: true }),
    ).toMatchObject({ allowed: false, code: "already_reviewed" });
    expect(
      canSubmitReview({ ...base, rating: 0 }),
    ).toMatchObject({ allowed: false, code: "invalid_rating" });
    expect(
      canSubmitReview({ ...base, rating: 6 }),
    ).toMatchObject({ allowed: false, code: "invalid_rating" });
    expect(
      canSubmitReview({ ...base, comment: "x".repeat(2001) }),
    ).toMatchObject({ allowed: false, code: "invalid_comment" });
  });
});
