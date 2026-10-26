import type { DemoApplication } from "@/lib/applications/demo";
import type { DemoChat } from "@/lib/chat/demo";
import { isHoldExpired } from "@/lib/payments/hold";
import type {
  DemoAssignment,
  DemoAssignmentStatus,
} from "@/lib/payments/demo";
import type { TaskSummary, UiTaskStatus } from "@/lib/tasks/types";

/** The only viewer fields the dashboard needs; the page passes its viewer snapshot. */
export type DashboardViewer = {
  signedIn: boolean;
  displayName: string | null;
};

export type DashboardRole = "poster" | "tasker";

export type DashboardSummary = {
  openTasks: number;
  awaitingReview: number;
  activeAssignments: number;
  paymentActions: number;
};

export type DashboardTask = {
  id: string;
  title: string;
  status: UiTaskStatus;
  category: string;
  budgetCents: number;
  awaitingReview: number;
  assignmentStatus: DemoAssignmentStatus | null;
  href: string;
};

export type DashboardApplication = {
  id: string;
  taskId: string;
  taskTitle: string;
  tasker: string;
  amountCents: number | null;
  verification: DemoApplication["verification"];
  createdAt: string;
  href: string;
};

export type DashboardAssignment = {
  id: string;
  taskId: string;
  taskTitle: string;
  tasker: string;
  role: DashboardRole;
  amountCents: number;
  payoutCents: number;
  paidAt: string | null;
  href: string;
};

export type DashboardActivityKind =
  | "application_submitted"
  | "tasker_selected"
  | "payment_completed"
  | "message";

export type DashboardActivity = {
  id: string;
  kind: DashboardActivityKind;
  taskId: string;
  taskTitle: string;
  description: string;
  createdAt: string;
  href: string;
  role: DashboardRole;
};

export type DashboardActionKind =
  | "complete_payment"
  | "retry_payment"
  | "hold_expired";

export type DashboardAction = {
  id: string;
  kind: DashboardActionKind;
  taskId: string;
  taskTitle: string;
  label: string;
  href: string;
  dueAt: string | null;
  tone: "pending" | "negative";
};

export type DashboardScope = "signed_out" | "empty" | "ready";

export type DashboardViewState =
  | "loading"
  | "error"
  | "signed_out"
  | "empty"
  | "ready";

/** The feed is a dashboard glance, not a paginated history. */
const ACTIVITY_LIMIT = 8;

const actionMeta: Record<
  DashboardActionKind,
  Pick<DashboardAction, "label" | "tone">
> = {
  complete_payment: { label: "Complete payment", tone: "pending" },
  retry_payment: { label: "Retry payment", tone: "negative" },
  hold_expired: { label: "Review task", tone: "negative" },
};

function taskHref(taskId: string): string {
  return `/tasks/${taskId}`;
}

/** The viewer's role in a task, or null when they are neither Poster nor Tasker. */
function roleFor(
  task: TaskSummary,
  viewer: string,
  tasker: string | null,
): DashboardRole | null {
  if (task.poster === viewer) return "poster";
  if (tasker === viewer) return "tasker";
  return null;
}

export type DashboardData = {
  scope: DashboardScope;
  displayName: string | null;
  summary: DashboardSummary | null;
  postedTasks: DashboardTask[];
  awaitingReview: DashboardApplication[];
  activeAssignments: DashboardAssignment[];
  activity: DashboardActivity[];
  actions: DashboardAction[];
};

export type DashboardInput = {
  viewer: DashboardViewer;
  tasks: readonly TaskSummary[];
  applications: readonly DemoApplication[];
  assignments: readonly DemoAssignment[];
  chats: readonly DemoChat[];
  now?: Date;
};

/**
 * Builds the signed-in dashboard from marketplace records only.
 *
 * Demo records are keyed by display name, so every section is filtered to tasks
 * the viewer posted or assignments and conversations they participate in.
 * Support actions are absent because no support-case records exist yet; the feed
 * and action list never show a synthetic metric or placeholder queue.
 */
export function buildDashboard(input: DashboardInput): DashboardData {
  const displayName = input.viewer.displayName?.trim() || null;

  if (!input.viewer.signedIn || !displayName) {
    return {
      scope: "signed_out",
      displayName: null,
      summary: null,
      postedTasks: [],
      awaitingReview: [],
      activeAssignments: [],
      activity: [],
      actions: [],
    };
  }

  const myTasks = input.tasks.filter((task) => task.poster === displayName);
  const myTaskIds = new Set(myTasks.map((task) => task.id));
  const taskById = new Map(input.tasks.map((task) => [task.id, task]));

  // First assignment wins, matching demoAssignmentForTask.
  const assignmentByTask = new Map<string, DemoAssignment>();
  for (const assignment of input.assignments) {
    if (!assignmentByTask.has(assignment.taskId)) {
      assignmentByTask.set(assignment.taskId, assignment);
    }
  }

  const activeAssignments = input.assignments
    .filter((assignment) => assignment.status === "active")
    .flatMap<DashboardAssignment>((assignment) => {
      const task = taskById.get(assignment.taskId);
      if (!task) return [];
      const role = roleFor(task, displayName, assignment.tasker);
      if (!role) return [];

      return [
        {
          id: assignment.id,
          taskId: task.id,
          taskTitle: task.title,
          tasker: assignment.tasker,
          role,
          amountCents: assignment.amountCents,
          payoutCents: assignment.payoutCents,
          paidAt: assignment.paidAt,
          href: taskHref(task.id),
        },
      ];
    })
    .sort((a, b) => {
      const byPaid = (b.paidAt ?? "").localeCompare(a.paidAt ?? "");
      return byPaid !== 0 ? byPaid : a.id.localeCompare(b.id);
    });

  const now = input.now ?? new Date();
  const actions = input.assignments
    .flatMap<DashboardAction>((assignment) => {
      if (assignment.status !== "pending_payment") return [];
      const task = taskById.get(assignment.taskId);
      if (!task || task.poster !== displayName) return [];

      const expired = isHoldExpired(
        new Date(assignment.holdExpiresAt),
        now,
      );
      const kind: DashboardActionKind = expired
        ? "hold_expired"
        : assignment.lastError
          ? "retry_payment"
          : "complete_payment";

      return [
        {
          id: assignment.id,
          kind,
          taskId: task.id,
          taskTitle: task.title,
          ...actionMeta[kind],
          href: taskHref(task.id),
          dueAt: assignment.holdExpiresAt,
        },
      ];
    })
    .sort((a, b) => {
      const aExpired = a.kind === "hold_expired";
      const bExpired = b.kind === "hold_expired";
      if (aExpired !== bExpired) return aExpired ? -1 : 1;
      const byDue = (a.dueAt ?? "").localeCompare(b.dueAt ?? "");
      return byDue !== 0 ? byDue : a.id.localeCompare(b.id);
    });

  const reviewCounts = new Map<string, number>();
  const awaitingReview: DashboardApplication[] = [];

  for (const application of input.applications) {
    if (application.status !== "submitted") continue;
    const task = taskById.get(application.taskId);
    if (!task || !myTaskIds.has(task.id) || task.status !== "open") continue;

    reviewCounts.set(task.id, (reviewCounts.get(task.id) ?? 0) + 1);
    awaitingReview.push({
      id: application.id,
      taskId: task.id,
      taskTitle: task.title,
      tasker: application.tasker,
      amountCents: application.amountCents,
      verification: application.verification,
      createdAt: application.createdAt,
      href: taskHref(task.id),
    });
  }

  awaitingReview.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const postedTasks = myTasks.map<DashboardTask>((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    category: task.category,
    budgetCents: Math.round(task.budget * 100),
    awaitingReview: reviewCounts.get(task.id) ?? 0,
    assignmentStatus: assignmentByTask.get(task.id)?.status ?? null,
    href: taskHref(task.id),
  }));

  const activity = buildActivity({
    viewer: displayName,
    taskById,
    applications: input.applications,
    assignments: input.assignments,
    chats: input.chats,
  });

  const summary: DashboardSummary = {
    openTasks: postedTasks.filter((task) => task.status === "open").length,
    awaitingReview: awaitingReview.length,
    activeAssignments: activeAssignments.length,
    paymentActions: actions.length,
  };

  return {
    scope:
      postedTasks.length > 0 ||
      activeAssignments.length > 0 ||
      actions.length > 0 ||
      activity.length > 0
        ? "ready"
        : "empty",
    displayName,
    summary,
    postedTasks,
    awaitingReview,
    activeAssignments,
    activity,
    actions,
  };
}

function buildActivity(input: {
  viewer: string;
  taskById: ReadonlyMap<string, TaskSummary>;
  applications: readonly DemoApplication[];
  assignments: readonly DemoAssignment[];
  chats: readonly DemoChat[];
}): DashboardActivity[] {
  const activity: DashboardActivity[] = [];

  for (const application of input.applications) {
    const task = input.taskById.get(application.taskId);
    if (!task) continue;
    const role = roleFor(task, input.viewer, application.tasker);
    if (!role) continue;

    activity.push({
      id: `application:${application.id}`,
      kind: "application_submitted",
      taskId: task.id,
      taskTitle: task.title,
      description:
        role === "poster"
          ? `${application.tasker} applied to ${task.title}.`
          : `You applied to ${task.title}.`,
      createdAt: application.createdAt,
      href: taskHref(task.id),
      role,
    });
  }

  for (const assignment of input.assignments) {
    const task = input.taskById.get(assignment.taskId);
    if (!task) continue;
    const role = roleFor(task, input.viewer, assignment.tasker);
    if (!role) continue;

    activity.push({
      id: `selection:${assignment.id}`,
      kind: "tasker_selected",
      taskId: task.id,
      taskTitle: task.title,
      description:
        role === "poster"
          ? `You selected ${assignment.tasker} for ${task.title}.`
          : `${task.poster} selected you for ${task.title}.`,
      createdAt: assignment.selectedAt,
      href: taskHref(task.id),
      role,
    });

    if (assignment.status === "active" && assignment.paidAt) {
      activity.push({
        id: `payment:${assignment.id}`,
        kind: "payment_completed",
        taskId: task.id,
        taskTitle: task.title,
        description:
          role === "poster"
            ? `Payment for ${task.title} completed.`
            : `Payment for ${task.title} is complete; your assignment is active.`,
        createdAt: assignment.paidAt,
        href: taskHref(task.id),
        role,
      });
    }
  }

  for (const conversation of input.chats) {
    const task = input.taskById.get(conversation.taskId);
    if (!task) continue;
    const role = roleFor(task, input.viewer, conversation.opener);
    if (!role) continue;
    const other =
      role === "poster" ? conversation.opener : conversation.poster;

    for (const message of conversation.messages) {
      activity.push({
        id: `message:${message.id}`,
        kind: "message",
        taskId: task.id,
        taskTitle: task.title,
        description:
          message.sender === input.viewer
            ? `You messaged ${other} about ${task.title}.`
            : `${message.sender} messaged you about ${task.title}.`,
        createdAt: message.createdAt,
        href: taskHref(task.id),
        role,
      });
    }
  }

  activity.sort((a, b) => {
    const byTime =
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return byTime !== 0 ? byTime : a.id.localeCompare(b.id);
  });

  return activity.slice(0, ACTIVITY_LIMIT);
}

/**
 * The dashboard's single presentation state. A storage failure wins over a slow
 * load so the page never claims an empty marketplace when data could not be read.
 */
export function dashboardViewState(input: {
  ready: boolean;
  error: boolean;
  scope: DashboardScope;
}): DashboardViewState {
  if (input.error) return "error";
  if (!input.ready) return "loading";
  return input.scope;
}
