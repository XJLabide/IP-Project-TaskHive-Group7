import { prisma } from "@/lib/prisma";
import { listOwnedTasks } from "@/lib/tasks/owner-service";
import { listApplicationsForTasker } from "@/lib/applications/service";
import { listChats } from "@/lib/chat/service";
import { toDomainStatus } from "@/lib/verification/mapping";
import { isHoldExpired } from "@/lib/payments/hold";
import { emptyDashboardData, type DashboardData, type DashboardActivity, type DashboardAction, type DashboardApplication } from "./data";
import type { TaskSummary } from "@/lib/tasks/types";


export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [user, ownedTasks, applications, chats, activeRows, holdRows] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    listOwnedTasks(userId),
    listApplicationsForTasker(userId),
    listChats(userId),
    prisma.assignment.findMany({
      where: {
        status: "ACTIVE",
        OR: [{ task: { posterId: userId } }, { taskerId: userId }],
      },
      select: {
        id: true,
        taskId: true,
        taskerId: true,
        activatedAt: true,
        tasker: { select: { name: true } },
        task: {
          select: {
            id: true,
            title: true,
            posterId: true,
            poster: { select: { name: true } },
            payments: { select: { amountCents: true, platformFeeCents: true }, take: 1 },
          },
        },
      },
      orderBy: { activatedAt: "desc" },
    }),
    prisma.assignment.findMany({
      where: { status: "PENDING_PAYMENT", task: { posterId: userId } },
      select: {
        id: true,
        taskId: true,
        holdExpiresAt: true,
        task: { select: { title: true } },
      },
      orderBy: { holdExpiresAt: "asc" },
    }),
  ]);

  if (!user) {
    return emptyDashboardData({ signedIn: true, displayName: null });
  }

  const liveTaskIds = ownedTasks.filter((task) => task.status === "open").map((task) => task.id);
  const [posterBids, posterRequests] = liveTaskIds.length === 0
    ? [[], []]
    : await Promise.all([
        prisma.bid.findMany({
          where: { taskId: { in: liveTaskIds }, status: "SUBMITTED" },
          select: {
            id: true,
            taskId: true,
            taskerId: true,
            amountCents: true,
            createdAt: true,
            tasker: { select: { name: true, taskerVerification: { select: { status: true } } } },
            task: { select: { title: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.taskRequest.findMany({
          where: { taskId: { in: liveTaskIds }, status: "SUBMITTED" },
          select: {
            id: true,
            taskId: true,
            taskerId: true,
            createdAt: true,
            tasker: { select: { name: true, taskerVerification: { select: { status: true } } } },
            task: { select: { title: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

  const toDashboardApplication = (application: {
    id: string;
    taskId: string;
    tasker: { name: string; taskerVerification: { status: "NOT_STARTED" | "PENDING" | "VERIFIED" | "REJECTED" } | null };
    task: { title: string };
    createdAt: Date;
    amountCents: number | null;
  }): DashboardApplication => ({
      id: application.id,
      taskId: application.taskId,
      taskTitle: application.task.title,
      tasker: application.tasker.name,
      amountCents: application.amountCents,
      verification: toDomainStatus[application.tasker.taskerVerification?.status ?? "NOT_STARTED"],
      createdAt: application.createdAt.toISOString(),
      href: `/tasks/${encodeURIComponent(application.taskId)}`,
    });
  const awaitingReview = [
    ...posterBids.map(toDashboardApplication),
    ...posterRequests.map((application) => toDashboardApplication({ ...application, amountCents: null })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const activeAssignments = activeRows.map((assignment) => {
    const role = assignment.task.posterId === userId ? "poster" as const : "tasker" as const;
    const payment = assignment.task.payments[0];
    const amountCents = payment?.amountCents ?? 0;
    return {
      id: assignment.id,
      taskId: assignment.taskId,
      taskTitle: assignment.task.title,
      tasker: assignment.tasker.name,
      role,
      amountCents,
      payoutCents: amountCents - (payment?.platformFeeCents ?? 0),
      paidAt: assignment.activatedAt?.toISOString() ?? null,
      href: `/tasks/${encodeURIComponent(assignment.taskId)}`,
    };
  });

  const actions: DashboardAction[] = holdRows.map((assignment) => {
    const expired = assignment.holdExpiresAt ? isHoldExpired(assignment.holdExpiresAt, new Date()) : true;
    const kind = expired ? "hold_expired" as const : "complete_payment" as const;
    return {
      id: assignment.id,
      kind,
      taskId: assignment.taskId,
      taskTitle: assignment.task.title,
      label: kind === "hold_expired" ? "Review task" : "Complete payment",
      href: `/tasks/${encodeURIComponent(assignment.taskId)}`,
      dueAt: assignment.holdExpiresAt?.toISOString() ?? null,
      tone: expired ? "negative" : "pending",
    };
  });

  const reviewCounts = new Map<string, number>();
  for (const application of awaitingReview) {
    reviewCounts.set(application.taskId, (reviewCounts.get(application.taskId) ?? 0) + 1);
  }
  const assignmentStatusByTask = new Map<string, "pending_payment" | "active">();
  for (const assignment of activeRows) assignmentStatusByTask.set(assignment.taskId, "active");
  for (const assignment of holdRows) assignmentStatusByTask.set(assignment.taskId, "pending_payment");

  const postedTasks = ownedTasks.map((task) => dashboardTask(task, reviewCounts, assignmentStatusByTask));
  const activity: DashboardActivity[] = [];

  for (const application of awaitingReview) {
    activity.push({
      id: `application:${application.id}`,
      kind: "application_submitted",
      taskId: application.taskId,
      taskTitle: application.taskTitle,
      description: `${application.tasker} applied to ${application.taskTitle}.`,
      createdAt: application.createdAt,
      href: application.href,
      role: "poster",
    });
  }
  for (const application of applications) {
    if (!application.createdAt) continue;
    const taskTitle = application.taskTitle;
    activity.push({
      id: `application:${application.id}`,
      kind: "application_submitted",
      taskId: application.taskId,
      taskTitle,
      description: `You applied to ${taskTitle}.`,
      createdAt: application.createdAt.toISOString(),
      href: `/tasks/${encodeURIComponent(application.taskId)}`,
      role: "tasker",
    });
  }
  for (const assignment of activeRows) {
    const role = assignment.task.posterId === userId ? "poster" as const : "tasker" as const;
    const taskerName = assignment.tasker.name;
    activity.push({
      id: `payment:${assignment.id}`,
      kind: "payment_completed",
      taskId: assignment.taskId,
      taskTitle: assignment.task.title,
      description: role === "poster"
        ? `Payment for ${assignment.task.title} completed.`
        : `Payment for ${assignment.task.title} is complete; your assignment is active.`,
      createdAt: assignment.activatedAt?.toISOString() ?? "",
      href: `/tasks/${encodeURIComponent(assignment.taskId)}`,
      role,
    });
    if (role === "poster") {
      activity.push({
        id: `selection:${assignment.id}`,
        kind: "tasker_selected",
        taskId: assignment.taskId,
        taskTitle: assignment.task.title,
        description: `You selected ${taskerName} for ${assignment.task.title}.`,
        createdAt: assignment.activatedAt?.toISOString() ?? "",
        href: `/tasks/${encodeURIComponent(assignment.taskId)}`,
        role,
      });
    }
  }
  for (const chat of chats) {
    if (!chat.lastMessage) continue;
    const role = chat.posterId === userId ? "poster" as const : "tasker" as const;
    activity.push({
      id: `message:${chat.id}:${chat.lastMessage.createdAt.toISOString()}`,
      kind: "message",
      taskId: chat.taskId,
      taskTitle: chat.taskTitle,
      description: chat.lastMessage.senderId === userId
        ? `You messaged about ${chat.taskTitle}.`
        : `You have a new message about ${chat.taskTitle}.`,
      createdAt: chat.lastMessage.createdAt.toISOString(),
      href: `/tasks/${encodeURIComponent(chat.taskId)}#chat`,
      role,
    });
  }
  activity.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const summary = {
    openTasks: postedTasks.filter((task) => task.status === "open").length,
    awaitingReview: awaitingReview.length,
    activeAssignments: activeAssignments.length,
    paymentActions: actions.length,
  };
  const hasData = postedTasks.length + awaitingReview.length + activeAssignments.length + actions.length + activity.length > 0;

  return {
    scope: hasData ? "ready" : "empty",
    displayName: user.name?.trim() || null,
    summary,
    postedTasks,
    awaitingReview,
    activeAssignments,
    activity: activity.slice(0, 8),
    actions,
  };
}
function dashboardTask(
  task: TaskSummary,
  reviewCounts: ReadonlyMap<string, number>,
  assignmentStatus: ReadonlyMap<string, "pending_payment" | "active">,
) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    category: task.category,
    budgetCents: Math.round(task.budget * 100),
    awaitingReview: reviewCounts.get(task.id) ?? 0,
    assignmentStatus: assignmentStatus.get(task.id) ?? null,
    href: `/tasks/${encodeURIComponent(task.id)}`,
  };
}
