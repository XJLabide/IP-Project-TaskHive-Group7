import type { Category, Task } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publishJob } from "@/lib/queue/qstash";
import {
  changedMaterialFields,
  transition,
  type TaskLifecycleStatus,
} from "./lifecycle";
import {
  toDbFulfillment,
  toDbHiring,
  toDbTaskStatus,
  toDomainFulfillment,
  toDomainHiring,
  toDomainTaskStatus,
} from "./mapping";
import { categoryForFulfillment } from "./policy";
import {
  hasTaskErrors,
  validateTaskDraft,
  validateTaskForPublish,
  type TaskFieldErrors,
  type TaskFields,
} from "./validation";

export type TaskFieldsPatch = Partial<TaskFields>;

export type TaskWriteSuccess = {
  ok: true;
  taskId: string;
  status: TaskLifecycleStatus | null;
  clearedApplications?: number;
};

export type TaskWriteFailure =
  | { ok: false; code: "validation_failed"; errors: TaskFieldErrors }
  | {
      ok: false;
      code:
        | "not_found"
        | "forbidden"
        | "invalid_transition"
        | "published_task_must_be_cancelled";
      reason: string;
    };

export type TaskWriteResult = TaskWriteSuccess | TaskWriteFailure;

type TaskRecord = Task & { category: Pick<Category, "name"> | null };

function toFields(task: TaskRecord): TaskFields {
  return {
    title: task.title,
    description: task.description,
    category: task.category?.name ?? "",
    budgetCents: task.budgetCents,
    deadline: task.deadline,
    fulfillmentMode: toDomainFulfillment[task.fulfillmentMode],
    hiringMode: toDomainHiring[task.hiringMode],
    locationLabel: task.locationLabel,
  };
}

function toData(fields: TaskFields, categoryId: string) {
  return {
    title: fields.title.trim(),
    description: fields.description.trim(),
    categoryId,
    budgetCents: fields.budgetCents,
    deadline: fields.deadline ? new Date(fields.deadline) : null,
    locationLabel:
      fields.fulfillmentMode === "local" ? fields.locationLabel?.trim() || null : null,
    fulfillmentMode: toDbFulfillment[fields.fulfillmentMode],
    hiringMode: toDbHiring[fields.hiringMode],
  };
}

/** Resolves the allow-listed category row, or null when policy rejects it. */
async function categoryRow(fields: TaskFields): Promise<{ id: string } | null> {
  const decision = categoryForFulfillment(fields.category, fields.fulfillmentMode);
  if (!decision.allowed) return null;

  return prisma.category.upsert({
    where: { name: decision.category.label },
    update: {},
    create: { name: decision.category.label },
    select: { id: true },
  });
}

async function ownedTask(
  taskId: string,
  posterId: string,
): Promise<
  | { ok: true; task: TaskRecord }
  | { ok: false; code: "not_found" | "forbidden"; reason: string }
> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { category: { select: { name: true } } },
  });

  if (!task) return { ok: false, code: "not_found", reason: "Task not found." };
  if (task.posterId !== posterId) {
    return {
      ok: false,
      code: "forbidden",
      reason: "Only the Poster who owns this task can change it.",
    };
  }

  return { ok: true, task };
}

function invalidCategory(): TaskWriteFailure {
  return {
    ok: false,
    code: "validation_failed",
    errors: { category: "Choose a launch-approved category." },
  };
}

/** Creates a draft or a published task after policy and field validation. */
export async function createTask(
  posterId: string,
  fields: TaskFields,
  publish: boolean,
): Promise<TaskWriteResult> {
  const now = new Date();
  const errors = publish
    ? validateTaskForPublish(fields, now)
    : validateTaskDraft(fields);

  if (hasTaskErrors(errors)) {
    return { ok: false, code: "validation_failed", errors };
  }

  const category = await categoryRow(fields);
  if (!category) return invalidCategory();

  const task = await prisma.task.create({
    data: {
      posterId,
      ...toData(fields, category.id),
      status: publish ? toDbTaskStatus.open : toDbTaskStatus.draft,
      publishedAt: publish ? now : null,
    },
    select: { id: true, status: true },
  });

  return {
    ok: true,
    taskId: task.id,
    status: toDomainTaskStatus[task.status],
  };
}

/**
 * Edits a draft or open task. A material edit on an open task withdraws every
 * pending application and tells those Taskers why, in one transaction.
 */
export async function updateTask(
  taskId: string,
  posterId: string,
  patch: TaskFieldsPatch,
  options: { publish?: boolean } = {},
): Promise<TaskWriteResult> {
  const owned = await ownedTask(taskId, posterId);
  if (!owned.ok) return owned;

  const current = toFields(owned.task);
  const status = toDomainTaskStatus[owned.task.status];
  const next: TaskFields = {
    title: patch.title ?? current.title,
    description: patch.description ?? current.description,
    category: patch.category ?? current.category,
    budgetCents: patch.budgetCents ?? current.budgetCents,
    deadline: patch.deadline !== undefined ? patch.deadline : current.deadline,
    fulfillmentMode: patch.fulfillmentMode ?? current.fulfillmentMode,
    hiringMode: patch.hiringMode ?? current.hiringMode,
    locationLabel:
      patch.locationLabel !== undefined ? patch.locationLabel : current.locationLabel,
  };

  const now = new Date();
  const publishing = options.publish === true;

  if (publishing) {
    const publish = transition(status, { type: "publish" });
    if (!publish.ok) return publish;
  } else if (status !== "draft" && status !== "open") {
    return {
      ok: false,
      code: "invalid_transition",
      reason: "Only a draft or open task can be edited.",
    };
  }

  const errors = publishing
    ? validateTaskForPublish(next, now)
    : validateTaskDraft(next);
  if (hasTaskErrors(errors)) {
    return { ok: false, code: "validation_failed", errors };
  }

  const category = await categoryRow(next);
  if (!category) return invalidCategory();

  const materialFields = changedMaterialFields(current, next);
  const materialEdit = !publishing && status === "open" && materialFields.length > 0;

  const edit = transition(status, {
    type: "edit",
    materialFields,
    openApplications: materialEdit ? 1 : 0,
  });
  if (!edit.ok) return edit;

  const taskerIds = await prisma.$transaction(async (tx) => {
    let affected: string[] = [];

    if (materialEdit) {
      // Read and withdraw inside the transaction so an application that lands
      // during the edit is cleared and notified too.
      const [bids, requests] = await Promise.all([
        tx.bid.findMany({
          where: { taskId, status: "SUBMITTED" },
          select: { taskerId: true },
        }),
        tx.taskRequest.findMany({
          where: { taskId, status: "SUBMITTED" },
          select: { taskerId: true },
        }),
      ]);
      affected = [...new Set([...bids, ...requests].map((row) => row.taskerId))];

      await tx.bid.updateMany({
        where: { taskId, status: "SUBMITTED" },
        data: { status: "WITHDRAWN" },
      });
      await tx.taskRequest.updateMany({
        where: { taskId, status: "SUBMITTED" },
        data: { status: "WITHDRAWN" },
      });
    }

    await tx.task.update({
      where: { id: taskId },
      data: {
        ...toData(next, category.id),
        ...(publishing
          ? { status: toDbTaskStatus.open, publishedAt: now }
          : {}),
      },
    });

    return affected;
  });

  if (materialEdit && taskerIds.length > 0) {
    await publishJob("notify.task.material_edit", {
      taskId,
      taskerIds,
      fields: materialFields,
    });
  }

  return {
    ok: true,
    taskId,
    status: publishing ? "open" : status,
    clearedApplications: materialEdit ? taskerIds.length : 0,
  };
}

/** Cancels an open published task without removing its applications. */
export async function cancelTask(
  taskId: string,
  posterId: string,
): Promise<TaskWriteResult> {
  const owned = await ownedTask(taskId, posterId);
  if (!owned.ok) return owned;

  const status = toDomainTaskStatus[owned.task.status];
  const cancelled = transition(status, { type: "cancel" });
  if (!cancelled.ok) return cancelled;

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: toDbTaskStatus.cancelled,
      cancelledAt: new Date(),
    },
  });

  return { ok: true, taskId, status: "cancelled" };
}

/** Deletes an unpublished draft; published tasks must be cancelled instead. */
export async function deleteTask(
  taskId: string,
  posterId: string,
): Promise<TaskWriteResult> {
  const owned = await ownedTask(taskId, posterId);
  if (!owned.ok) return owned;

  const status = toDomainTaskStatus[owned.task.status];
  const deleted = transition(status, { type: "delete" });
  if (!deleted.ok) return deleted;

  await prisma.task.delete({ where: { id: taskId } });

  return { ok: true, taskId, status: null };
}
