"use client";

import { useMemo, useSyncExternalStore } from "react";
import { tasks as sampleTasks } from "@/lib/sample-data";
import type { TaskSummary, TaskWriteResult } from "@/lib/tasks/types";
import {
  applyCancelTask,
  applyCreateTask,
  applyDeleteTask,
  applyUpdateTask,
} from "@/lib/tasks/ui-store";
import type { TaskFields } from "@/lib/tasks/validation";

export type Task = TaskSummary;

type TaskStore = {
  tasks: Task[];
  ready: boolean;
  error: boolean;
  createTask: (
    fields: TaskFields,
    publish: boolean,
    options?: { poster?: string },
  ) => TaskWriteResult;
  updateTask: (
    id: string,
    fields: TaskFields,
    options?: { publish?: boolean },
  ) => TaskWriteResult;
  cancelTask: (id: string) => TaskWriteResult;
  deleteTask: (id: string) => TaskWriteResult;
  resetDemo: () => void;
};

const storageKey = "taskhive.mock-tasks.v2";
let tasksSnapshot: Task[] = sampleTasks;
let initialized = false;
let storageError = false;
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(tasksSnapshot));
  } catch {
    // Keep the in-memory store usable when browser storage is unavailable.
    storageError = true;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!initialized && typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) tasksSnapshot = parsed as Task[];
      }
    } catch {
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        storageError = true;
      }
      tasksSnapshot = sampleTasks;
    }
    initialized = true;
    listeners.forEach((notify) => notify());
  }
  return () => listeners.delete(listener);
}

function getTasksSnapshot() {
  return tasksSnapshot;
}

function getServerTasksSnapshot() {
  return sampleTasks;
}

function getReadySnapshot() {
  return initialized;
}

function getServerReadySnapshot() {
  return false;
}

function getErrorSnapshot() {
  return storageError;
}

function getServerErrorSnapshot() {
  return false;
}

function resetDemo() {
  tasksSnapshot = sampleTasks;
  storageError = false;
  initialized = true;
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    // The in-memory sample data still works for this session.
  }
  // Do not persist here: a broken storage backend must not re-raise the error.
  listeners.forEach((listener) => listener());
}

function notify() {
  persist();
  listeners.forEach((listener) => listener());
}

function createTask(
  fields: TaskFields,
  publish: boolean,
  options: { poster?: string } = {},
): TaskWriteResult {
  const id = `task_${crypto.randomUUID()}`;
  const outcome = applyCreateTask(tasksSnapshot, fields, publish, {
    id,
    poster: options.poster,
  });

  if (!outcome.result.ok) return outcome.result;
  tasksSnapshot = outcome.tasks;
  notify();
  return outcome.result;
}

function updateTask(
  id: string,
  fields: TaskFields,
  options: { publish?: boolean } = {},
): TaskWriteResult {
  const outcome = applyUpdateTask(tasksSnapshot, id, fields, options);

  if (!outcome.result.ok) return outcome.result;
  tasksSnapshot = outcome.tasks;
  notify();
  return outcome.result;
}

function cancelTask(id: string): TaskWriteResult {
  const outcome = applyCancelTask(tasksSnapshot, id);

  if (!outcome.result.ok) return outcome.result;
  tasksSnapshot = outcome.tasks;
  notify();
  return outcome.result;
}

function deleteTask(id: string): TaskWriteResult {
  const outcome = applyDeleteTask(tasksSnapshot, id);

  if (!outcome.result.ok) return outcome.result;
  tasksSnapshot = outcome.tasks;
  notify();
  return outcome.result;
}

export function useMockTasks(): TaskStore {
  const tasks = useSyncExternalStore(subscribe, getTasksSnapshot, getServerTasksSnapshot);
  const ready = useSyncExternalStore(subscribe, getReadySnapshot, getServerReadySnapshot);
  const error = useSyncExternalStore(subscribe, getErrorSnapshot, getServerErrorSnapshot);
  return useMemo(
    () => ({ tasks, ready, error, createTask, updateTask, cancelTask, deleteTask, resetDemo }),
    [tasks, ready, error],
  );
}
