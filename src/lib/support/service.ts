import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notifications";
import { isUniqueViolation } from "@/lib/db/errors";
import { toDomainTaskStatus } from "@/lib/tasks/mapping";
import {
  canRequestCancellation,
  canResolveSupportCase,
  payoutEffect,
  REVIEW_TARGET_BUSINESS_DAYS,
  reportDecision,
  reviewDueAt,
  type ReportDecision,
  type SupportOutcome,
  type SupportRuleCode,
} from "./rules";

export type SupportFailureCode =
  | SupportRuleCode
  | "not_found"
  | "forbidden"
  | "invalid_reason"
  | "invalid_state"
  | "payout_missing"
  | "invalid_amount";

export type SupportFailure = {
  ok: false;
  code: SupportFailureCode;
  reason: string;
};

export type CancellationRequestResult =
  | {
      ok: true;
      request: { id: string; taskId: string; reviewDueAt: Date };
    }
  | SupportFailure;

export type ResolutionResult =
  | {
      ok: true;
      caseId: string;
      outcome: SupportOutcome;
      payoutCents: number;
    }
  | SupportFailure;

export type ReportResult = { ok: true; reportId: string; status: string } | SupportFailure;

function failure(code: SupportFailureCode, reason: string): SupportFailure {
  return { ok: false, code, reason };
}

async function payoutTotals(taskId: string): Promise<{
  paymentId: string | null;
  amountCents: number;
  platformFeeCents: number;
  netCents: number;
}> {
  const payment = await prisma.payment.findUnique({
    where: { taskId },
    select: { id: true, amountCents: true, platformFeeCents: true },
  });

  return {
    paymentId: payment?.id ?? null,
    amountCents: payment?.amountCents ?? 0,
    platformFeeCents: payment?.platformFeeCents ?? 0,
    netCents: payment ? payment.amountCents - payment.platformFeeCents : 0,
  };
}

async function recordAdminAction(
  input: {
    adminId: string;
    action: string;
    targetType: string;
    targetId: string;
    notes?: string | null;
    metadata: Record<string, unknown>;
  },
  executor: Pick<typeof prisma, "adminAction"> = prisma,
) {
  return executor.adminAction.create({
    data: {
      adminId: input.adminId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      notes: input.notes?.trim() || null,
      metadata: input.metadata as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
}

/** Either participant can pause a hired task while Admin reviews cancellation. */
export async function requestCancellation(input: {
  actorId: string;
  taskId: string;
  reason: string;
  now?: Date;
}): Promise<CancellationRequestResult> {
  const reason = input.reason.trim();
  if (reason.length < 10) {
    return failure("invalid_reason", "Explain the cancellation in at least 10 characters.");
  }

  const now = input.now ?? new Date();
  const task = await prisma.task.findUnique({
    where: { id: input.taskId },
    select: {
      id: true,
      posterId: true,
      title: true,
      status: true,
      assignment: { select: { taskerId: true, status: true } },
      disputes: {
        where: { status: "OPEN" },
        select: { id: true },
        take: 1,
      },
      cancellations: {
        where: { status: { in: ["OPEN", "REVIEWING"] } },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!task || !task.assignment) {
    return failure("not_found", "Task or assignment not found.");
  }

  const decision = canRequestCancellation({
    actorId: input.actorId,
    posterId: task.posterId,
    taskerId: task.assignment.taskerId,
    taskStatus: toDomainTaskStatus[task.status],
    openCancellation: task.cancellations.length > 0,
    openDispute: task.disputes.length > 0,
  });

  if (!decision.allowed) return failure(decision.code, decision.reason);

  const dueAt = reviewDueAt(now);
  let request: { id: string; taskId: string; reviewDueAt: Date } | null = null;

  try {
    request = await prisma.$transaction(async (tx) => {
    const paused = await tx.task.updateMany({
      where: {
        id: task.id,
        status: { in: ["ASSIGNED", "IN_PROGRESS", "AWAITING_CONFIRMATION"] },
      },
      data: { status: "CANCELLATION_REVIEW" },
    });

    if (paused.count === 0) return null;

    return tx.cancellationRequest.create({
      data: {
        taskId: task.id,
        requestedById: input.actorId,
        reason,
        reviewDueAt: dueAt,
        createdAt: now,
      },
        select: { id: true, taskId: true, reviewDueAt: true },
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return failure("already_open", "A cancellation request is already open for this task.");
    }
    throw error;
  }

  if (!request) {
    return failure("not_hired", "This task can no longer be cancelled.");
  }

  const counterpart =
    input.actorId === task.posterId
      ? task.assignment.taskerId
      : task.posterId;

  await notifyUser({
    userId: counterpart,
    type: "support.cancellation_requested",
    title: `Cancellation requested for “${task.title}”`,
    body: "Work and payout are paused while TaskHive support reviews the request.",
    href: `/tasks/${encodeURIComponent(task.id)}`,
    eventKey: `support:cancellation-request:${request.id}:${counterpart}`,
  });

  return { ok: true, request };
}

async function resolveCase(input: {
  adminId: string;
  kind: "cancellation" | "dispute";
  caseId: string;
  outcome: SupportOutcome;
  payoutCents?: number;
  notes?: string;
  now?: Date;
}): Promise<ResolutionResult> {
  const now = input.now ?? new Date();
  const caseRow =
    input.kind === "cancellation"
      ? await prisma.cancellationRequest.findUnique({
          where: { id: input.caseId },
          select: {
            id: true,
            status: true,
            taskId: true,
            requestedById: true,
            task: {
              select: {
                posterId: true,
                title: true,
                status: true,
                assignment: { select: { taskerId: true } },
              },
            },
          },
        })
      : await prisma.dispute.findUnique({
          where: { id: input.caseId },
          select: {
            id: true,
            status: true,
            taskId: true,
            openedById: true,
            task: {
              select: {
                posterId: true,
                title: true,
                status: true,
                assignment: { select: { taskerId: true } },
              },
            },
          },
        });

  if (!caseRow || !caseRow.task.assignment) {
    return failure("not_found", "Support case not found.");
  }

  const decision = canResolveSupportCase({ status: caseRow.status });
  if (!decision.allowed) return failure(decision.code, decision.reason);

  const totals = await payoutTotals(caseRow.taskId);
  const effect = payoutEffect(input.outcome, {
    netCents: totals.netCents,
    requestedCents: input.payoutCents,
  });

  if (!effect.ok) return failure(effect.code, effect.reason);

  if (input.outcome !== "FULL_REFUND" && (!totals.paymentId || totals.netCents <= 0)) {
    return failure("payout_missing", "This task has no payout to release.");
  }

  const refundedCents =
    input.outcome === "FULL_REFUND"
      ? totals.amountCents
      : input.outcome === "PARTIAL_PAYOUT"
        ? totals.amountCents - totals.platformFeeCents - effect.effect.payoutCents
        : 0;

  const applied = await prisma.$transaction(async (tx) => {
    const updated =
      input.kind === "cancellation"
        ? await tx.cancellationRequest.updateMany({
            where: {
              id: caseRow.id,
              status: { in: ["OPEN", "REVIEWING"] },
            },
            data: {
              status: "RESOLVED",
              resolution: input.outcome,
              payoutCents: effect.effect.payoutCents,
              resolvedById: input.adminId,
              resolvedAt: now,
            },
          })
        : await tx.dispute.updateMany({
            where: {
              id: caseRow.id,
              status: { in: ["OPEN", "REVIEWING"] },
            },
            data: {
              status: "RESOLVED",
              resolution: input.outcome,
              payoutCents: effect.effect.payoutCents,
              resolvedById: input.adminId,
              resolvedAt: now,
            },
          });

    if (updated.count === 0) return false;

    const taskUpdate = await tx.task.updateMany({
      where: { id: caseRow.taskId, status: { in: ["CANCELLATION_REVIEW", "DISPUTED"] } },
      data: { status: effect.effect.taskStatus === "completed" ? "COMPLETED" : "CANCELLED" },
    });

    if (taskUpdate.count === 0) return false;

    const assignmentUpdate = await tx.assignment.updateMany({
      where: { taskId: caseRow.taskId, status: { in: ["ACTIVE", "DISPUTED"] } },
      data: {
        status: effect.effect.taskStatus === "completed" ? "COMPLETED" : "CANCELLED",
        ...(effect.effect.taskStatus === "completed" ? { confirmedAt: now } : {}),
      },
    });

    if (assignmentUpdate.count === 0) return false;

    if (totals.paymentId) {
      const paymentUpdate = await tx.payment.updateMany({
        where: {
          id: totals.paymentId,
          status: { in: ["PAID_PENDING_COMPLETION", "DISPUTED"] },
        },
        data: {
          status: effect.effect.paymentStatus,
          refundedCents,
          refundedAt: refundedCents > 0 ? now : null,
        },
      });

      if (paymentUpdate.count === 0) return false;

      if (effect.effect.releasePayout) {
        const payoutUpdate = await tx.payout.updateMany({
          where: { paymentId: totals.paymentId, releasedAt: null },
          data: { amountCents: effect.effect.payoutCents, releasedAt: now },
        });

        if (payoutUpdate.count === 0) return false;
      }
    }

    await recordAdminAction(
      {
        adminId: input.adminId,
        action: `support.${input.kind}.resolve`,
        targetType:
          input.kind === "cancellation" ? "CancellationRequest" : "Dispute",
        targetId: caseRow.id,
        notes: input.notes,
        metadata: {
          taskId: caseRow.taskId,
          outcome: input.outcome,
          payoutCents: effect.effect.payoutCents,
          paymentId: totals.paymentId,
        },
      },
      tx,
    );

    return true;
  });

  if (!applied) {
    return failure("invalid_state", "The case, task, or payment changed before resolution.");
  }

  const recipients = new Set([
    caseRow.task.posterId,
    caseRow.task.assignment.taskerId,
  ]);

  for (const userId of recipients) {
    await notifyUser({
      userId,
      type: "support.case_resolved",
      title: `Support resolved “${caseRow.task.title}”`,
      body: "Sign in to review the resolution and related task details.",
      href: `/tasks/${encodeURIComponent(caseRow.taskId)}`,
      eventKey: `support:case-resolved:${caseRow.id}:${userId}`,
    });
  }

  return {
    ok: true,
    caseId: caseRow.id,
    outcome: input.outcome,
    payoutCents: effect.effect.payoutCents,
  };
}

export function resolveCancellation(input: {
  adminId: string;
  caseId: string;
  outcome: SupportOutcome;
  payoutCents?: number;
  notes?: string;
  now?: Date;
}): Promise<ResolutionResult> {
  return resolveCase({ ...input, kind: "cancellation" });
}

export function resolveDispute(input: {
  adminId: string;
  caseId: string;
  outcome: SupportOutcome;
  payoutCents?: number;
  notes?: string;
  now?: Date;
}): Promise<ResolutionResult> {
  return resolveCase({ ...input, kind: "dispute" });
}

/** Reports stay separate from disputes; a report never releases a payout. */
export async function resolveReport(input: {
  adminId: string;
  reportId: string;
  decision: ReportDecision;
  notes?: string;
  now?: Date;
}): Promise<ReportResult> {
  const now = input.now ?? new Date();
  const report = await prisma.report.findUnique({
    where: { id: input.reportId },
    select: {
      id: true,
      status: true,
      reporterId: true,
      reportedUserId: true,
      taskId: true,
      reportedUser: { select: { isAdmin: true } },
    },
  });

  if (!report) return failure("not_found", "Report not found.");

  const decision = canResolveSupportCase({ status: report.status });
  if (!decision.allowed) return failure(decision.code, decision.reason);

  const outcome = reportDecision(input.decision);

  if (outcome.suspendUser && report.reportedUser?.isAdmin) {
    return failure("forbidden", "Admin accounts are managed outside the support queue.");
  }

  const applied = await prisma.$transaction(async (tx) => {
    const updated = await tx.report.updateMany({
      where: { id: report.id, status: { in: ["OPEN", "REVIEWING"] } },
      data: { status: outcome.status, updatedAt: now },
    });

    if (updated.count === 0) return false;

    if (outcome.suspendUser && report.reportedUserId) {
      await tx.user.updateMany({
        where: { id: report.reportedUserId },
        data: { status: "SUSPENDED" },
      });
    }

    await recordAdminAction(
      {
        adminId: input.adminId,
        action: `support.report.${input.decision}`,
        targetType: "Report",
        targetId: report.id,
        notes: input.notes,
        metadata: {
          taskId: report.taskId,
          reportedUserId: report.reportedUserId,
          decision: input.decision,
        },
      },
      tx,
    );

    return true;
  });

  if (!applied) {
    return failure("already_resolved", "This report is already resolved.");
  }

  const reportTitle =
    input.decision === "dismiss"
      ? "A support report was dismissed"
      : input.decision === "warn"
        ? "A support report was upheld with a warning"
        : "An account was suspended after a report";

  for (const userId of [report.reporterId, report.reportedUserId]) {
    if (!userId) continue;
    await notifyUser({
      userId,
      type: "support.report_resolved",
      title: reportTitle,
      body: "Sign in to review the support update.",
      eventKey: `support:report-resolved:${report.id}:${userId}`,
    });
  }

  return { ok: true, reportId: report.id, status: outcome.status };
}

/** Basic user oversight; Admins cannot suspend themselves or another Admin. */
export async function setUserStatus(input: {
  adminId: string;
  userId: string;
  status: "ACTIVE" | "SUSPENDED";
  notes?: string;
}): Promise<{ ok: true; userId: string; status: string } | SupportFailure> {
  if (input.adminId === input.userId) {
    return failure("forbidden", "Admins cannot change their own account status.");
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, isAdmin: true, status: true },
  });

  if (!user) return failure("not_found", "User not found.");
  if (user.isAdmin) {
    return failure("forbidden", "Admin accounts are managed outside the support queue.");
  }

  let adminActionId = "";
  await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: { id: input.userId, isAdmin: false },
      data: { status: input.status },
    });

    const adminAction = await recordAdminAction(
      {
        adminId: input.adminId,
        action: `admin.user.${input.status.toLowerCase()}`,
        targetType: "User",
        targetId: input.userId,
        notes: input.notes,
        metadata: { from: user.status, to: input.status },
      },
      tx,
    );
    adminActionId = adminAction.id;
  });

  await notifyUser({
    userId: input.userId,
    type: "admin.user_status",
    title:
      input.status === "SUSPENDED"
        ? "Your TaskHive account was suspended"
        : "Your TaskHive account was reinstated",
    body: "Sign in to review your account status and any available next steps.",
    eventKey: `admin.user-status:${adminActionId}:${input.userId}`,
  });

  return { ok: true, userId: input.userId, status: input.status };
}

export type SupportQueue = {
  reviewTargetBusinessDays: number;
  reports: Array<{
    id: string;
    reason: string;
    status: string;
    createdAt: Date;
    reporter: string;
    reportedUser: string | null;
    taskTitle: string | null;
    messageBody: string | null;
    dueAt: Date;
  }>;
  disputes: Array<{
    id: string;
    taskId: string;
    taskTitle: string;
    reason: string;
    openedBy: string;
    status: string;
    createdAt: Date;
    dueAt: Date;
    evidenceNote: string | null;
    evidenceUrl: string | null;
  }>;
  cancellations: Array<{
    id: string;
    taskId: string;
    taskTitle: string;
    reason: string;
    requestedBy: string;
    status: string;
    createdAt: Date;
    dueAt: Date;
    evidenceNote: string | null;
    evidenceUrl: string | null;
  }>;
  verificationAppeals: Array<{
    userId: string;
    name: string;
    appealedAt: Date | null;
    appealNote: string | null;
    dueAt: Date;
  }>;
  recentTasks: Array<{
    id: string;
    title: string;
    status: string;
    poster: string;
    updatedAt: Date;
  }>;
  recentUsers: Array<{
    id: string;
    name: string;
    status: string;
    isAdmin: boolean;
    updatedAt: Date;
  }>;
  recentDecisions: Array<{
    id: string;
    action: string;
    targetType: string;
    targetId: string;
    notes: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    admin: string;
  }>;
  totals: {
    users: number;
    tasks: number;
    completedTasks: number;
    openReports: number;
    openDisputes: number;
    openCancellations: number;
    pendingVerificationAppeals: number;
  };
};

/** One queue for Admin v1: reports, disputes, cancellations, and appeals. */
export async function listSupportQueue(): Promise<SupportQueue> {
  const [
    reports,
    disputes,
    cancellations,
    appeals,
    recentTasks,
    recentUsers,
    recentDecisions,
    users,
    tasks,
    completed,
  ] = await Promise.all([
      prisma.report.findMany({
        where: { status: { in: ["OPEN", "REVIEWING"] } },
        select: {
          id: true,
          reason: true,
          status: true,
          createdAt: true,
          reporter: { select: { name: true } },
          reportedUser: { select: { name: true } },
          task: { select: { title: true } },
          message: { select: { body: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.dispute.findMany({
        where: { status: { in: ["OPEN", "REVIEWING"] } },
        select: {
          id: true,
          taskId: true,
          reason: true,
          status: true,
          createdAt: true,
          reviewDueAt: true,
          openedBy: { select: { name: true } },
          task: {
            select: {
              title: true,
              assignment: {
                select: { completionNote: true, completionUrl: true },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.cancellationRequest.findMany({
        where: { status: { in: ["OPEN", "REVIEWING"] } },
        select: {
          id: true,
          taskId: true,
          reason: true,
          status: true,
          createdAt: true,
          reviewDueAt: true,
          requestedBy: { select: { name: true } },
          task: {
            select: {
              title: true,
              assignment: {
                select: { completionNote: true, completionUrl: true },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.taskerVerification.findMany({
        where: { appealStatus: "PENDING" },
        select: {
          userId: true,
          appealedAt: true,
          appealNote: true,
          user: { select: { name: true } },
        },
        orderBy: { appealedAt: "asc" },
      }),
      prisma.task.findMany({
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true,
          poster: { select: { name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),
      prisma.user.findMany({
        where: { isAdmin: false },
        select: {
          id: true,
          name: true,
          status: true,
          isAdmin: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
      }),
      prisma.adminAction.findMany({
        select: {
          id: true,
          action: true,
          targetType: true,
          targetId: true,
          notes: true,
          metadata: true,
          createdAt: true,
          admin: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.user.count(),
      prisma.task.count(),
      prisma.task.count({ where: { status: "COMPLETED" } }),
    ]);

  return {
    reviewTargetBusinessDays: REVIEW_TARGET_BUSINESS_DAYS,
    reports: reports.map((report) => ({
      id: report.id,
      reason: report.reason,
      status: report.status,
      createdAt: report.createdAt,
      reporter: report.reporter.name,
      reportedUser: report.reportedUser?.name ?? null,
      taskTitle: report.task?.title ?? null,
      messageBody: report.message?.body ?? null,
      dueAt: reviewDueAt(report.createdAt),
    })),
    disputes: disputes.map((dispute) => ({
      id: dispute.id,
      taskId: dispute.taskId,
      taskTitle: dispute.task.title,
      reason: dispute.reason,
      openedBy: dispute.openedBy.name,
      status: dispute.status,
      createdAt: dispute.createdAt,
      dueAt: dispute.reviewDueAt ?? reviewDueAt(dispute.createdAt),
      evidenceNote: dispute.task.assignment?.completionNote ?? null,
      evidenceUrl: dispute.task.assignment?.completionUrl ?? null,
    })),
    cancellations: cancellations.map((request) => ({
      id: request.id,
      taskId: request.taskId,
      taskTitle: request.task.title,
      reason: request.reason,
      requestedBy: request.requestedBy.name,
      status: request.status,
      createdAt: request.createdAt,
      dueAt: request.reviewDueAt,
      evidenceNote: request.task.assignment?.completionNote ?? null,
      evidenceUrl: request.task.assignment?.completionUrl ?? null,
    })),
    verificationAppeals: appeals.map((appeal) => ({
      userId: appeal.userId,
      name: appeal.user.name,
      appealedAt: appeal.appealedAt,
      appealNote: appeal.appealNote,
      dueAt: appeal.appealedAt
        ? reviewDueAt(appeal.appealedAt)
        : reviewDueAt(new Date()),
    })),
    recentTasks: recentTasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      poster: task.poster.name,
      updatedAt: task.updatedAt,
    })),
    recentUsers: recentUsers.map((user) => ({
      id: user.id,
      name: user.name,
      status: user.status,
      isAdmin: user.isAdmin,
      updatedAt: user.updatedAt,
    })),
    recentDecisions: recentDecisions.map((decision) => ({
      id: decision.id,
      action: decision.action,
      targetType: decision.targetType,
      targetId: decision.targetId,
      notes: decision.notes,
      metadata: (decision.metadata as Record<string, unknown> | null) ?? null,
      createdAt: decision.createdAt,
      admin: decision.admin.name,
    })),
    totals: {
      users,
      tasks,
      completedTasks: completed,
      openReports: reports.length,
      openDisputes: disputes.length,
      openCancellations: cancellations.length,
      pendingVerificationAppeals: appeals.length,
    },
  };
}
