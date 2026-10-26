import { describe, expect, it } from "vitest";
import {
  DEMO_PROVIDER_LABEL,
  demoAssignmentForTask,
  expireHoldIfDue,
  formatRemaining,
  recordPayment,
  remainingMs,
  selectDemoTasker,
  startDemoCheckout,
  type DemoAssignment,
} from "./demo";
import type { DemoApplication } from "@/lib/applications/demo";
import type { TaskSummary } from "@/lib/tasks/types";

const now = new Date("2026-10-26T10:00:00.000Z");

function task(overrides: Partial<TaskSummary> = {}): TaskSummary {
  return {
    id: "task_1",
    title: "Pick up groceries",
    description: "Buy groceries and deliver them nearby.",
    category: "Delivery",
    fulfillmentMode: "local",
    hiringMode: "bidding",
    status: "open",
    budget: 450,
    location: "Sampaloc, Manila",
    deadline: "2026-11-02T17:00:00+08:00",
    poster: "Maria Santos",
    applications: 1,
    ...overrides,
  };
}

function application(overrides: Partial<DemoApplication> = {}): DemoApplication {
  return {
    id: "application_1",
    taskId: "task_1",
    tasker: "Ana Reyes",
    kind: "bid",
    status: "submitted",
    amountCents: 43000,
    message: "I can deliver before 5 PM.",
    estimatedTime: "1 hour",
    verification: "verified",
    createdAt: "2026-10-25T10:00:00.000Z",
    ...overrides,
  };
}

function assignment(overrides: Partial<DemoAssignment> = {}): DemoAssignment {
  return {
    id: "assignment_1",
    taskId: "task_1",
    tasker: "Ana Reyes",
    applicationId: "application_1",
    status: "pending_payment",
    selectedAt: now.toISOString(),
    holdExpiresAt: "2026-10-27T10:00:00.000Z",
    amountCents: 43000,
    platformFeeCents: 2150,
    payoutCents: 40850,
    paymentStatus: "unpaid",
    attemptCount: 0,
    lastError: null,
    paidAt: null,
    ...overrides,
  };
}

describe("selecting a Tasker", () => {
  it("reserves the accepted bid and opens the 24-hour hold", () => {
    const result = selectDemoTasker({
      assignments: [],
      task: task(),
      application: application(),
      id: "assignment_new",
      now,
    });

    expect(result).toMatchObject({
      ok: true,
      assignment: {
        id: "assignment_new",
        tasker: "Ana Reyes",
        status: "pending_payment",
        amountCents: 43000,
        platformFeeCents: 2150,
        payoutCents: 40850,
        paymentStatus: "unpaid",
        attemptCount: 0,
      },
    });
    expect(result.ok && result.assignment.holdExpiresAt).toBe(
      "2026-10-27T10:00:00.000Z",
    );
  });

  it("uses the listed price for fixed-price tasks", () => {
    const result = selectDemoTasker({
      assignments: [],
      task: task({ hiringMode: "fixed_price", budget: 900 }),
      application: application({ kind: "request", amountCents: 90000 }),
      id: "assignment_new",
      now,
    });

    expect(result.ok && result.assignment.amountCents).toBe(90000);
    expect(result.ok && result.assignment.platformFeeCents).toBe(4500);
    expect(result.ok && result.assignment.payoutCents).toBe(85500);
  });

  it("refuses unverified applicants, closed tasks, and a second selection", () => {
    expect(
      selectDemoTasker({
        assignments: [],
        task: task(),
        application: application({ verification: "pending" }),
        id: "assignment_new",
        now,
      }),
    ).toMatchObject({ ok: false, reason: expect.stringMatching(/verification/i) });

    expect(
      selectDemoTasker({
        assignments: [],
        task: task({ status: "pending_payment" }),
        application: application(),
        id: "assignment_new",
        now,
      }),
    ).toMatchObject({ ok: false, reason: expect.stringMatching(/open/i) });

    expect(
      selectDemoTasker({
        assignments: [assignment()],
        task: task(),
        application: application(),
        id: "assignment_new",
        now,
      }),
    ).toMatchObject({ ok: false, reason: expect.stringMatching(/already/i) });
  });
});

describe("checkout and payment", () => {
  it("counts every checkout attempt without changing the fee", () => {
    const first = startDemoCheckout(assignment());
    expect(first).toMatchObject({ paymentStatus: "checkout_started", attemptCount: 1 });
    expect(first.platformFeeCents).toBe(2150);

    const second = startDemoCheckout(first);
    expect(second).toMatchObject({ paymentStatus: "checkout_started", attemptCount: 2 });
  });

  it("records a failed attempt as unpaid with a retry message and the same hold", () => {
    const failed = recordPayment(assignment({ attemptCount: 1 }), "failure", now);

    expect(failed).toMatchObject({
      status: "pending_payment",
      paymentStatus: "unpaid",
      attemptCount: 1,
      holdExpiresAt: "2026-10-27T10:00:00.000Z",
    });
    expect(failed.lastError).toMatch(/declined|could not/i);
  });

  it("activates the assignment after a successful payment", () => {
    const paid = recordPayment(
      assignment({ paymentStatus: "checkout_started", attemptCount: 1 }),
      "success",
      now,
    );

    expect(paid).toMatchObject({
      status: "active",
      paymentStatus: "paid",
      paidAt: now.toISOString(),
      lastError: null,
    });
  });

  it("surfaces the provider as an evaluation, never as escrow", () => {
    expect(DEMO_PROVIDER_LABEL).toMatch(/evaluation/i);
    expect(DEMO_PROVIDER_LABEL.toLowerCase()).not.toContain("escrow");
  });
});

describe("hold expiry", () => {
  it("expires only once the 24 hours have passed", () => {
    expect(expireHoldIfDue(assignment(), now).expired).toBe(false);

    const later = new Date("2026-10-27T10:00:01.000Z");
    const result = expireHoldIfDue(assignment(), later);

    expect(result.expired).toBe(true);
    expect(result.assignment.status).toBe("expired");
    expect(remainingMs(assignment(), later)).toBeLessThanOrEqual(0);
  });

  it("does not expire a paid assignment", () => {
    const paid = assignment({ status: "active", paymentStatus: "paid" });
    expect(expireHoldIfDue(paid, new Date("2026-11-01T00:00:00.000Z")).expired).toBe(false);
  });

  it("formats the retry window", () => {
    expect(formatRemaining(24 * 60 * 60 * 1000)).toBe("24h 00m");
    expect(formatRemaining(90 * 60 * 1000 + 5000)).toBe("1h 30m");
    expect(formatRemaining(0)).toBe("expired");
    expect(formatRemaining(-1000)).toBe("expired");
  });
});

describe("assignment lookup", () => {
  it("finds the hold for a task", () => {
    expect(demoAssignmentForTask([assignment()], "task_1")?.id).toBe("assignment_1");
    expect(demoAssignmentForTask([assignment()], "task_2")).toBeNull();
  });
});
