import { describe, expect, it } from "vitest";
import {
  canApply,
  canApprove,
  canWithdraw,
  kindForHiringMode,
  type ApplicationStatus,
  type ApplicationTask,
} from "./rules";

function task(overrides: Partial<ApplicationTask> = {}): ApplicationTask {
  return {
    posterId: "poster_1",
    status: "open",
    hiringMode: "bidding",
    ...overrides,
  };
}

describe("application kind", () => {
  it("maps hiring modes to bids and requests", () => {
    expect(kindForHiringMode("bidding")).toBe("bid");
    expect(kindForHiringMode("fixed_price")).toBe("request");
  });
});

describe("application eligibility", () => {
  const base = {
    taskerId: "tasker_1",
    kind: "bid" as const,
    task: task(),
    verification: "pending" as const,
    existingStatuses: [] as ApplicationStatus[],
  };

  it("lets a Tasker bid on an open bidding task", () => {
    expect(canApply(base)).toEqual({ allowed: true });
  });

  it("lets a Tasker request an open fixed-price task", () => {
    expect(
      canApply({
        ...base,
        kind: "request",
        task: task({ hiringMode: "fixed_price" }),
      }),
    ).toEqual({ allowed: true });
  });

  it("rejects the wrong application type for the hiring mode", () => {
    expect(canApply({ ...base, kind: "request" })).toMatchObject({
      allowed: false,
      code: "wrong_hiring_mode",
    });
    expect(
      canApply({ ...base, kind: "bid", task: task({ hiringMode: "fixed_price" }) }),
    ).toMatchObject({ allowed: false, code: "wrong_hiring_mode" });
  });

  it("rejects applications to a task that is not open", () => {
    for (const status of ["draft", "pending_payment", "cancelled", "completed"] as const) {
      expect(canApply({ ...base, task: task({ status }) })).toMatchObject({
        allowed: false,
        code: "task_not_open",
      });
    }
  });

  it("rejects applying to your own task", () => {
    expect(canApply({ ...base, taskerId: "poster_1" })).toMatchObject({
      allowed: false,
      code: "own_task",
    });
  });

  it("rejects a verification-rejected Tasker", () => {
    expect(canApply({ ...base, verification: "rejected" })).toMatchObject({
      allowed: false,
      code: "verification_rejected",
    });
  });

  it("rejects a duplicate live application but allows re-applying after withdrawal", () => {
    for (const status of ["submitted", "accepted"] as const) {
      expect(canApply({ ...base, existingStatuses: [status] })).toMatchObject({
        allowed: false,
        code: "duplicate_application",
      });
    }

    for (const status of ["withdrawn", "invalidated"] as const) {
      expect(canApply({ ...base, existingStatuses: [status] })).toEqual({ allowed: true });
    }

    expect(canApply({ ...base, existingStatuses: ["rejected"] })).toMatchObject({
      allowed: false,
      code: "application_rejected",
    });
  });
});

describe("application withdrawal", () => {
  it("withdraws a submitted application while the task is open or in the payment hold", () => {
    for (const taskStatus of ["open", "pending_payment"] as const) {
      expect(canWithdraw({ applicationStatus: "submitted", taskStatus })).toEqual({
        allowed: true,
      });
    }
  });

  it("refuses once a Tasker is assigned or the task closes", () => {
    for (const taskStatus of [
      "assigned",
      "in_progress",
      "cancelled",
      "completed",
    ] as const) {
      expect(
        canWithdraw({ applicationStatus: "submitted", taskStatus }),
      ).toMatchObject({ allowed: false, code: "applications_locked" });
    }
  });

  it("refuses to withdraw anything that is not submitted", () => {
    for (const applicationStatus of [
      "accepted",
      "rejected",
      "withdrawn",
      "invalidated",
    ] as const) {
      expect(canWithdraw({ applicationStatus, taskStatus: "open" })).toMatchObject({
        allowed: false,
        code: "application_not_submitted",
      });
    }
  });
});

describe("application approval", () => {
  const base = {
    applicationStatus: "submitted" as const,
    taskStatus: "open" as const,
    verification: "verified" as const,
  };

  it("lets a Poster approve a verified Tasker's submitted application", () => {
    expect(canApprove(base)).toEqual({ allowed: true });
  });

  it("keeps pending-verification applications visible but not approvable", () => {
    for (const verification of ["not_started", "pending"] as const) {
      expect(canApprove({ ...base, verification })).toMatchObject({
        allowed: false,
        code: "pending_verification",
      });
    }
  });

  it("refuses rejected Taskers and applications that are not submitted", () => {
    expect(canApprove({ ...base, verification: "rejected" })).toMatchObject({
      allowed: false,
      code: "verification_rejected",
    });
    expect(canApprove({ ...base, applicationStatus: "withdrawn" })).toMatchObject({
      allowed: false,
      code: "application_not_submitted",
    });
    expect(canApprove({ ...base, taskStatus: "cancelled" })).toMatchObject({
      allowed: false,
      code: "applications_locked",
    });
  });
});
