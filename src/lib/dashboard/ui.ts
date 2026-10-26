import { formatChatTime } from "@/lib/chat/demo";
import type { TaskerVerificationStatus } from "@/lib/domain/access";
import type { UiTaskStatus } from "@/lib/tasks/types";
import type { DashboardSummary } from "./data";

export type DashboardMetricId =
  | "open_tasks"
  | "awaiting_review"
  | "active_assignments"
  | "payment_actions";

export type DashboardMetric = {
  id: DashboardMetricId;
  label: string;
  value: number;
  context: string;
  href: string;
};

export type StatusTone = "positive" | "pending" | "negative" | "neutral";

/** One card per metric the aggregation actually backs. */
export function dashboardMetrics(summary: DashboardSummary): DashboardMetric[] {
  return [
    {
      id: "open_tasks",
      label: "Open tasks",
      value: summary.openTasks,
      context: "Posted by you",
      href: "#your-tasks",
    },
    {
      id: "awaiting_review",
      label: "Awaiting review",
      value: summary.awaitingReview,
      context: "Applications to decide",
      href: "#review-queue",
    },
    {
      id: "active_assignments",
      label: "Active assignments",
      value: summary.activeAssignments,
      context: "Paid and in progress",
      href: "#assignments",
    },
    {
      id: "payment_actions",
      label: "Payment actions",
      value: summary.paymentActions,
      context: "Holds needing you",
      href: "#needs-action",
    },
  ];
}

/** A time-aware greeting that always uses the signed-in display name. */
export function dashboardGreeting(name: string | null, now: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-PH", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Asia/Manila",
    }).format(now),
  );
  const part =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return name ? `${part}, ${name}.` : `${part}.`;
}

export function formatMoney(cents: number): string {
  return `PHP ${(cents / 100).toFixed(2)}`;
}

/** The hold deadline, or the fact that the payment window already lapsed. */
export function formatHoldDue(dueAt: string | null, now: Date): string {
  if (!dueAt) return "";
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return "";

  const time = formatChatTime(dueAt);
  return due.getTime() <= now.getTime()
    ? `Window ended ${time}`
    : `Ends ${time}`;
}

export function taskStatusTone(status: UiTaskStatus): StatusTone {
  if (status === "assigned") return "positive";
  if (status === "cancelled") return "negative";
  if (status === "pending_payment") return "pending";
  return "neutral";
}

export function verificationTone(status: TaskerVerificationStatus): StatusTone {
  if (status === "verified") return "positive";
  if (status === "rejected") return "negative";
  if (status === "pending") return "pending";
  return "neutral";
}
