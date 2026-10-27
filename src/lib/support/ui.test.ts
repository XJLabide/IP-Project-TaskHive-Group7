import { describe, expect, it } from "vitest";
import {
  adminActionLabel,
  adminTaskStatusLabel,
  caseStatusTone,
  dueLabel,
  resolutionLabel,
} from "./ui";

describe("support UI labels", () => {
  it("labels resolution outcomes", () => {
    expect(resolutionLabel("FULL_REFUND")).toBe("Full refund");
    expect(resolutionLabel("PARTIAL_PAYOUT")).toBe("Partial payout");
    expect(resolutionLabel("FULL_PAYOUT")).toBe("Full payout");
  });

  it("maps database task statuses for Admin", () => {
    expect(adminTaskStatusLabel("CANCELLATION_REVIEW")).toBe("Cancellation review");
    expect(adminTaskStatusLabel("AWAITING_CONFIRMATION")).toBe(
      "Awaiting confirmation",
    );
    expect(adminTaskStatusLabel("SOME_NEW_STATUS")).toBe("some new status");
  });

  it("tones case statuses without using color alone", () => {
    expect(caseStatusTone("OPEN")).toBe("pending");
    expect(caseStatusTone("RESOLVED")).toBe("positive");
    expect(caseStatusTone("REJECTED")).toBe("negative");
    expect(caseStatusTone("UNKNOWN")).toBe("neutral");
  });

  it("labels audited actions for Admin readers", () => {
    expect(adminActionLabel("support.dispute.resolve")).toBe("Dispute resolved");
    expect(adminActionLabel("admin.user.suspended")).toBe("User suspended");
    expect(adminActionLabel("unknown.action")).toBe("unknown action");
  });

  it("marks review deadlines overdue", () => {
    const due = new Date("2026-11-03T09:00:00.000Z");

    expect(dueLabel(due, new Date("2026-11-02T09:00:00.000Z")).overdue).toBe(false);
    expect(dueLabel(due, new Date("2026-11-04T09:00:00.000Z")).overdue).toBe(true);
    expect(dueLabel(due, new Date("2026-11-04T09:00:00.000Z")).text).toMatch(
      /^Overdue · /,
    );
  });
});
