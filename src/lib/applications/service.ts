import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notifications";
import type { TaskerVerificationStatus } from "@/lib/domain/access";
import type {
  BidStatus as DbApplicationStatus,
  TaskStatus as DbTaskStatus,
  VerificationStatus as DbVerificationStatus,
} from "@prisma/client";
import { toDomainStatus as toDomainVerification } from "@/lib/verification/mapping";
import { toDomainHiring, toDomainTaskStatus } from "@/lib/tasks/mapping";
import {
  canApply,
  canApprove,
  canWithdraw,
  type ApplicationDenialCode,
  type ApplicationKind,
  type ApplicationStatus,
} from "./rules";
import { toDomainApplicationStatus } from "./mapping";

export type ApplicationFailureCode =
  | ApplicationDenialCode
  | "not_found"
  | "forbidden";

export type ApplicationFailure = {
  ok: false;
  code: ApplicationFailureCode;
  reason: string;
};

export type ApplicationView = {
  id: string;
  kind: ApplicationKind;
  taskId: string;
  taskerId: string;
  taskerName: string | null;
  verification: TaskerVerificationStatus;
  status: ApplicationStatus;
  amountCents: number | null;
  message: string | null;
  estimatedTime: string | null;
  createdAt: Date | null;
  approvable: boolean;
  blockedReason: string | null;
};

export type ApplicationCreated = { ok: true; application: ApplicationView };
export type ApplicationList =
  | { ok: true; role: "poster" | "tasker"; applications: ApplicationView[] }
  | ApplicationFailure;

export type BidInput = {
  amountCents: number;
  message: string;
  estimatedTime?: string | null;
};

export type RequestInput = {
  message?: string | null;
};

type ApplicationActor = {
  id: string;
  verification: TaskerVerificationStatus;
};

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

async function loadTask(taskId: string) {
  return prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      posterId: true,
      title: true,
      status: true,
      hiringMode: true,
    },
  });
}

function failure(code: ApplicationFailureCode, reason: string): ApplicationFailure {
  return { ok: false, code, reason };
}

async function notifyPoster(input: {
  posterId: string;
  taskId: string;
  taskerId: string;
  type: string;
  title: string;
  job: string;
}): Promise<void> {
  await notifyUser({
    userId: input.posterId,
    type: input.type,
    title: input.title,
    job: input.job,
    jobBody: { taskId: input.taskId, taskerId: input.taskerId },
  });
}

type SaveOutcome =
  | { ok: true; id: string }
  | { ok: false; code: "duplicate" };

async function saveBid(
  taskId: string,
  taskerId: string,
  existingId: string | null,
  data: { amountCents: number; message: string; estimatedTime: string | null },
): Promise<SaveOutcome> {
  const values = { ...data, status: "SUBMITTED" as const };

  if (existingId) {
    const reactivated = await prisma.bid.updateMany({
      where: {
        taskId,
        taskerId,
        status: { in: ["WITHDRAWN", "INVALIDATED"] },
      },
      data: values,
    });

    return reactivated.count > 0
      ? { ok: true, id: existingId }
      : { ok: false, code: "duplicate" };
  }

  try {
    const created = await prisma.bid.create({
      data: { taskId, taskerId, ...values },
      select: { id: true },
    });
    return { ok: true, id: created.id };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, code: "duplicate" };
    throw error;
  }
}

async function saveRequest(
  taskId: string,
  taskerId: string,
  existingId: string | null,
  data: { message: string | null },
): Promise<SaveOutcome> {
  const values = { ...data, status: "SUBMITTED" as const };

  if (existingId) {
    const reactivated = await prisma.taskRequest.updateMany({
      where: {
        taskId,
        taskerId,
        status: { in: ["WITHDRAWN", "INVALIDATED"] },
      },
      data: values,
    });

    return reactivated.count > 0
      ? { ok: true, id: existingId }
      : { ok: false, code: "duplicate" };
  }

  try {
    const created = await prisma.taskRequest.create({
      data: { taskId, taskerId, ...values },
      select: { id: true },
    });
    return { ok: true, id: created.id };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, code: "duplicate" };
    throw error;
  }
}

async function createApplication(input: {
  actor: ApplicationActor;
  taskId: string;
  kind: ApplicationKind;
  data: { amountCents: number | null; message: string | null; estimatedTime: string | null };
}): Promise<ApplicationCreated | ApplicationFailure> {
  const task = await loadTask(input.taskId);
  if (!task) return failure("not_found", "Task not found.");

  const [existingBid, existingRequest] = await Promise.all([
    prisma.bid.findUnique({
      where: { taskId_taskerId: { taskId: task.id, taskerId: input.actor.id } },
      select: { id: true, status: true },
    }),
    prisma.taskRequest.findUnique({
      where: { taskId_taskerId: { taskId: task.id, taskerId: input.actor.id } },
      select: { id: true, status: true },
    }),
  ]);

  const existing = input.kind === "bid" ? existingBid : existingRequest;

  const decision = canApply({
    taskerId: input.actor.id,
    kind: input.kind,
    task: {
      posterId: task.posterId,
      status: toDomainTaskStatus[task.status],
      hiringMode: toDomainHiring[task.hiringMode],
    },
    verification: input.actor.verification,
    existingStatuses: [existingBid, existingRequest]
      .filter((row): row is { id: string; status: DbApplicationStatus } => row !== null)
      .map((row) => toDomainApplicationStatus[row.status]),
  });

  if (!decision.allowed) {
    return failure(decision.code, decision.reason);
  }

  const saved =
    input.kind === "bid"
      ? await saveBid(task.id, input.actor.id, existing?.id ?? null, {
          amountCents: input.data.amountCents ?? 0,
          message: input.data.message ?? "",
          estimatedTime: input.data.estimatedTime,
        })
      : await saveRequest(task.id, input.actor.id, existing?.id ?? null, {
          message: input.data.message,
        });

  if (!saved.ok) {
    return failure("duplicate_application", "You already applied to this task.");
  }

  const id = saved.id;

  await notifyPoster({
    posterId: task.posterId,
    taskId: task.id,
    taskerId: input.actor.id,
    type: input.kind === "bid" ? "application.bid" : "application.request",
    title: input.kind === "bid" ? "New bid on your task" : "New request on your task",
    job: input.kind === "bid" ? "notify.bid.created" : "notify.task.requested",
  });

  const approval = canApprove({
    applicationStatus: "submitted",
    taskStatus: toDomainTaskStatus[task.status],
    verification: input.actor.verification,
  });

  return {
    ok: true,
    application: {
      id: id as string,
      kind: input.kind,
      taskId: task.id,
      taskerId: input.actor.id,
      taskerName: null,
      verification: input.actor.verification,
      status: "submitted",
      amountCents: input.data.amountCents,
      message: input.data.message,
      estimatedTime: input.data.estimatedTime,
      createdAt: null,
      approvable: approval.allowed,
      blockedReason: approval.allowed ? null : approval.reason,
    },
  };
}

/** Creates or reactivates a bid on an open bidding task. */
export async function createBid(
  actor: ApplicationActor,
  taskId: string,
  input: BidInput,
): Promise<ApplicationCreated | ApplicationFailure> {
  return createApplication({
    actor,
    taskId,
    kind: "bid",
    data: {
      amountCents: input.amountCents,
      message: input.message.trim(),
      estimatedTime: input.estimatedTime?.trim() || null,
    },
  });
}

/** Creates or reactivates a fixed-price request on an open task. */
export async function createRequest(
  actor: ApplicationActor,
  taskId: string,
  input: RequestInput,
): Promise<ApplicationCreated | ApplicationFailure> {
  return createApplication({
    actor,
    taskId,
    kind: "request",
    data: {
      amountCents: null,
      message: input.message?.trim() || null,
      estimatedTime: null,
    },
  });
}

type Withdrawable = {
  id: string;
  taskerId: string;
  status: ApplicationStatus;
  task: {
    id: string;
    posterId: string;
    title: string;
    status: DbTaskStatus;
  };
  kind: ApplicationKind;
};

async function findApplication(applicationId: string): Promise<Withdrawable | null> {
  const bid = await prisma.bid.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      taskerId: true,
      status: true,
      task: { select: { id: true, posterId: true, title: true, status: true } },
    },
  });

  if (bid) {
    return { ...bid, kind: "bid", status: toDomainApplicationStatus[bid.status] };
  }

  const request = await prisma.taskRequest.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      taskerId: true,
      status: true,
      task: { select: { id: true, posterId: true, title: true, status: true } },
    },
  });

  if (!request) return null;

  return {
    ...request,
    kind: "request",
    status: toDomainApplicationStatus[request.status],
  };
}

/** Withdraws a submitted application until the Poster starts hiring. */
export async function withdrawApplication(
  taskerId: string,
  applicationId: string,
): Promise<{ ok: true; status: "withdrawn" } | ApplicationFailure> {
  const application = await findApplication(applicationId);
  if (!application) return failure("not_found", "Application not found.");

  if (application.taskerId !== taskerId) {
    return failure("forbidden", "Only the Tasker who applied can withdraw.");
  }

  const taskStatus = toDomainTaskStatus[application.task.status];
  const decision = canWithdraw({
    applicationStatus: application.status,
    taskStatus,
  });

  if (!decision.allowed) {
    return failure(decision.code, decision.reason);
  }

  const withdrawn =
    application.kind === "bid"
      ? await prisma.bid.updateMany({
          where: { id: applicationId, taskerId, status: "SUBMITTED" },
          data: { status: "WITHDRAWN" },
        })
      : await prisma.taskRequest.updateMany({
          where: { id: applicationId, taskerId, status: "SUBMITTED" },
          data: { status: "WITHDRAWN" },
        });

  if (withdrawn.count === 0) {
    return failure(
      "application_not_submitted",
      "The application changed before it could be withdrawn. Reload and try again.",
    );
  }

  await notifyPoster({
    posterId: application.task.posterId,
    taskId: application.task.id,
    taskerId,
    type: "application.withdrawn",
    title: "A Tasker withdrew an application",
    job: "notify.application.withdrawn",
  });

  return { ok: true, status: "withdrawn" };
}

type ApplicationRow = {
  id: string;
  taskId: string;
  taskerId: string;
  amountCents: number | null;
  message: string | null;
  estimatedTime: string | null;
  status: DbApplicationStatus;
  createdAt: Date;
  task: { status: DbTaskStatus };
  tasker: {
    name: string;
    taskerVerification: { status: DbVerificationStatus } | null;
  } | null;
};

const verificationSelect = {
  select: {
    name: true,
    taskerVerification: { select: { status: true } },
  },
} as const;

const taskStatusSelect = { select: { status: true } } as const;

function toApplicationView(row: ApplicationRow, kind: ApplicationKind): ApplicationView {
  const verification = toDomainVerification[
    row.tasker?.taskerVerification?.status ?? "NOT_STARTED"
  ];
  const taskStatus = toDomainTaskStatus[row.task.status];
  const status = toDomainApplicationStatus[row.status];
  const approval = canApprove({
    applicationStatus: status,
    taskStatus,
    verification,
  });

  return {
    id: row.id,
    kind,
    taskId: row.taskId,
    taskerId: row.taskerId,
    taskerName: row.tasker?.name ?? null,
    verification,
    status,
    amountCents: row.amountCents,
    message: row.message,
    estimatedTime: row.estimatedTime,
    createdAt: row.createdAt,
    approvable: approval.allowed,
    blockedReason: approval.allowed ? null : approval.reason,
  };
}

/** Poster sees every application; anyone else sees only their own. */
export async function listApplicationsForTask(
  viewer: { id: string },
  taskId: string,
): Promise<ApplicationList> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { posterId: true },
  });

  if (!task) return failure("not_found", "Task not found.");

  const role = task.posterId === viewer.id ? "poster" : "tasker";
  const where = {
    taskId,
    ...(role === "tasker" ? { taskerId: viewer.id } : {}),
  };

  const [bids, requests] = await Promise.all([
    prisma.bid.findMany({
      where,
      select: {
        id: true,
        taskId: true,
        taskerId: true,
        amountCents: true,
        message: true,
        estimatedTime: true,
        status: true,
        createdAt: true,
        tasker: verificationSelect,
        task: taskStatusSelect,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.taskRequest.findMany({
      where,
      select: {
        id: true,
        taskId: true,
        taskerId: true,
        message: true,
        status: true,
        createdAt: true,
        tasker: verificationSelect,
        task: taskStatusSelect,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const applications = [
    ...bids.map((row) => toApplicationView({ ...row, amountCents: row.amountCents }, "bid")),
    ...requests.map((row) =>
      toApplicationView(
        { ...row, amountCents: null, estimatedTime: null },
        "request",
      ),
    ),
  ].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));

  return { ok: true, role, applications };
}

/** Every application the signed-in Tasker has made, across tasks. */
export async function listApplicationsForTasker(
  taskerId: string,
): Promise<ApplicationView[]> {
  const where = { taskerId };

  const [bids, requests] = await Promise.all([
    prisma.bid.findMany({
      where,
      select: {
        id: true,
        taskId: true,
        taskerId: true,
        amountCents: true,
        message: true,
        estimatedTime: true,
        status: true,
        createdAt: true,
        tasker: verificationSelect,
        task: taskStatusSelect,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.taskRequest.findMany({
      where,
      select: {
        id: true,
        taskId: true,
        taskerId: true,
        message: true,
        status: true,
        createdAt: true,
        tasker: verificationSelect,
        task: taskStatusSelect,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return [
    ...bids.map((row) => toApplicationView(row, "bid")),
    ...requests.map((row) =>
      toApplicationView({ ...row, amountCents: null, estimatedTime: null }, "request"),
    ),
  ].sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

export type ApprovableApplication =
  | { ok: true; application: { id: string; kind: ApplicationKind } }
  | ApplicationFailure;

/** The Poster-side gate the hire flow uses before selecting an applicant. */
export async function approveApplication(
  viewer: { id: string },
  taskId: string,
  taskerId: string,
): Promise<ApprovableApplication> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { posterId: true, status: true, hiringMode: true },
  });

  if (!task) return failure("not_found", "Task not found.");
  if (task.posterId !== viewer.id) {
    return failure("forbidden", "Only the Poster who owns this task can hire.");
  }

  const kind = toDomainHiring[task.hiringMode] === "bidding" ? "bid" : "request";
  const verificationOf = {
    select: { taskerVerification: { select: { status: true } } },
  } as const;

  const application =
    kind === "bid"
      ? await prisma.bid.findUnique({
          where: { taskId_taskerId: { taskId, taskerId } },
          select: { id: true, status: true, tasker: verificationOf },
        })
      : await prisma.taskRequest.findUnique({
          where: { taskId_taskerId: { taskId, taskerId } },
          select: { id: true, status: true, tasker: verificationOf },
        });

  if (!application) {
    return failure("not_found", "This Tasker has not applied to the task.");
  }

  const verification = toDomainVerification[
    application.tasker?.taskerVerification?.status ?? "NOT_STARTED"
  ];
  const decision = canApprove({
    applicationStatus: toDomainApplicationStatus[application.status],
    taskStatus: toDomainTaskStatus[task.status],
    verification,
  });

  if (!decision.allowed) return failure(decision.code, decision.reason);

  return { ok: true, application: { id: application.id, kind } };
}
