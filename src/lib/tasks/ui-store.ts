import { changedMaterialFields, transition } from "./lifecycle";
import type {
  TaskFormSource,
  TaskSummary,
  TaskWriteResult,
} from "./types";
import { taskToFields } from "./ui";
import {
  hasTaskErrors,
  validateTaskDraft,
  validateTaskForPublish,
  type TaskFields,
} from "./validation";

export type TaskMutation = {
  tasks: TaskSummary[];
  result: TaskWriteResult;
};

function summaryFields(fields: TaskFields): TaskFormSource {
  const budget = fields.budgetCents / 100;

  return {
    title: fields.title.trim(),
    description: fields.description.trim(),
    category: fields.category.trim(),
    fulfillmentMode: fields.fulfillmentMode,
    hiringMode: fields.hiringMode,
    budget: Number.isFinite(budget) ? Math.max(0, budget) : 0,
    location:
      fields.fulfillmentMode === "local" ? fields.locationLabel?.trim() || null : null,
    deadline: fields.deadline ? new Date(fields.deadline).toISOString() : "",
  };
}

function validateFields(fields: TaskFields, publish: boolean, now: Date) {
  return publish
    ? validateTaskForPublish(fields, now)
    : validateTaskDraft(fields);
}

export function applyCreateTask(
  tasks: TaskSummary[],
  fields: TaskFields,
  publish: boolean,
  options: { id: string; now?: Date; poster?: string },
): TaskMutation {
  const errors = validateFields(fields, publish, options.now ?? new Date());
  if (hasTaskErrors(errors)) return { tasks, result: { ok: false, errors } };

  const task: TaskSummary = {
    ...summaryFields(fields),
    id: options.id,
    status: publish ? "open" : "draft",
    distance: fields.fulfillmentMode === "remote" ? "Remote" : "Not set",
    poster: options.poster ?? "Ana Reyes",
    applications: 0,
  };

  return {
    tasks: [task, ...tasks],
    result: { ok: true, taskId: task.id, status: task.status },
  };
}

export function applyUpdateTask(
  tasks: TaskSummary[],
  id: string,
  fields: TaskFields,
  options: { publish?: boolean; now?: Date } = {},
): TaskMutation {
  const task = tasks.find((item) => item.id === id);
  if (!task) return { tasks, result: { ok: false, reason: "Task not found." } };

  const publish = options.publish === true;

  if (publish) {
    const published = transition(task.status, { type: "publish" });
    if (!published.ok) return { tasks, result: { ok: false, reason: published.reason } };
  }
  if (!publish && task.status !== "draft" && task.status !== "open") {
    return {
      tasks,
      result: { ok: false, reason: "Only a draft or open task can be edited." },
    };
  }

  const errors = validateFields(fields, publish, options.now ?? new Date());
  if (hasTaskErrors(errors)) return { tasks, result: { ok: false, errors } };

  const materialFields = changedMaterialFields(taskToFields(task), fields);
  const edit = transition(task.status, { type: "edit", materialFields });
  if (!edit.ok) return { tasks, result: { ok: false, reason: edit.reason } };

  const clears =
    edit.effects.some((effect) => effect.type === "clear_applications") &&
    task.applications > 0;

  return {
    tasks: tasks.map((item) =>
      item.id === id
        ? {
            ...item,
            ...summaryFields(fields),
            status: publish ? "open" : item.status,
            applications: clears ? 0 : item.applications,
          }
        : item,
    ),
    result: {
      ok: true,
      taskId: id,
      status: publish ? "open" : task.status,
      clearedApplications: clears ? task.applications : 0,
    },
  };
}

export function applyCancelTask(tasks: TaskSummary[], id: string): TaskMutation {
  const task = tasks.find((item) => item.id === id);
  if (!task) return { tasks, result: { ok: false, reason: "Task not found." } };

  const decision = transition(task.status, { type: "cancel" });
  if (!decision.ok) return { tasks, result: { ok: false, reason: decision.reason } };

  return {
    tasks: tasks.map((item) =>
      item.id === id ? { ...item, status: "cancelled" } : item,
    ),
    result: { ok: true, taskId: id, status: "cancelled" },
  };
}

export function applyDeleteTask(tasks: TaskSummary[], id: string): TaskMutation {
  const task = tasks.find((item) => item.id === id);
  if (!task) return { tasks, result: { ok: false, reason: "Task not found." } };

  const decision = transition(task.status, { type: "delete" });
  if (!decision.ok) return { tasks, result: { ok: false, reason: decision.reason } };

  return {
    tasks: tasks.filter((item) => item.id !== id),
    result: { ok: true, taskId: id, status: null },
  };
}
