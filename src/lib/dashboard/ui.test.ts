import { describe, expect, it } from "vitest";
import type { DashboardSummary } from "./data";
import {
  dashboardGreeting,
  dashboardMetrics,
  formatHoldDue,
  formatMoney,
  taskStatusTone,
  verificationTone,
} from "./ui";

describe("dashboard metrics", () => {
  it("maps the real summary counts to actionable cards", () => {
    const summary: DashboardSummary = {
      openTasks: 3,
      awaitingReview: 2,
      activeAssignments: 1,
      paymentActions: 0,
    };

    expect(dashboardMetrics(summary)).toEqual([
      {
        id: "open_tasks",
        label: "Open tasks",
        value: 3,
        context: "Posted by you",
        href: "#your-tasks",
      },
      {
        id: "awaiting_review",
        label: "Awaiting review",
        value: 2,
        context: "Applications to decide",
        href: "#review-queue",
      },
      {
        id: "active_assignments",
        label: "Active assignments",
        value: 1,
        context: "Paid and in progress",
        href: "#assignments",
      },
      {
        id: "payment_actions",
        label: "Payment actions",
        value: 0,
        context: "Holds needing you",
        href: "#needs-action",
      },
    ]);
  });

  it("keeps a zero metric instead of hiding it", () => {
    const metrics = dashboardMetrics({
      openTasks: 0,
      awaitingReview: 0,
      activeAssignments: 0,
      paymentActions: 0,
    });

    expect(metrics.every((metric) => metric.value === 0)).toBe(true);
  });
});

describe("dashboard greeting", () => {
  it("changes with Manila time and keeps the real display name", () => {
    expect(
      dashboardGreeting("Maria Santos", new Date("2026-10-27T04:00:00.000Z")),
    ).toBe("Good afternoon, Maria Santos.");
    expect(
      dashboardGreeting("Maria Santos", new Date("2026-10-27T09:59:00.000Z")),
    ).toBe("Good afternoon, Maria Santos.");
    expect(
      dashboardGreeting("Maria Santos", new Date("2026-10-27T10:00:00.000Z")),
    ).toBe("Good evening, Maria Santos.");
    expect(
      dashboardGreeting(null, new Date("2026-10-26T16:00:00.000Z")),
    ).toBe("Good morning.");
  });
});

describe("dashboard formatting", () => {
  it("formats cent amounts as pesos", () => {
    expect(formatMoney(28000)).toBe("PHP 280.00");
    expect(formatMoney(0)).toBe("PHP 0.00");
  });

  it("labels whether a payment hold is still running", () => {
    const now = new Date("2026-10-27T12:00:00.000Z");

    expect(formatHoldDue("2026-10-28T04:00:00.000Z", now)).toMatch(
      /^Ends Oct 28/,
    );
    expect(formatHoldDue("2026-10-27T11:00:00.000Z", now)).toMatch(
      /^Window ended Oct 27/,
    );
    expect(formatHoldDue("not-a-date", now)).toBe("");
  });
});

describe("task status tone", () => {
  it("reserves green for live work and red for cancelled work", () => {
    expect(taskStatusTone("open")).toBe("neutral");
    expect(taskStatusTone("assigned")).toBe("positive");
    expect(taskStatusTone("pending_payment")).toBe("pending");
    expect(taskStatusTone("cancelled")).toBe("negative");
    expect(taskStatusTone("draft")).toBe("neutral");
  });
});

describe("verification tone", () => {
  it("uses green only for a passed identity check", () => {
    expect(verificationTone("verified")).toBe("positive");
    expect(verificationTone("rejected")).toBe("negative");
    expect(verificationTone("pending")).toBe("pending");
    expect(verificationTone("not_started")).toBe("neutral");
  });
});
