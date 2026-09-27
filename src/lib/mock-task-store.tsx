"use client";

import { useMemo, useSyncExternalStore } from "react";
import { tasks as sampleTasks } from "@/lib/sample-data";

export type Task = {
  id: string;
  title: string;
  category: string;
  mode: string;
  status: string;
  budget: number;
  distance: string;
  location: string;
  deadline: string;
  poster: string;
  description: string;
  bids: number;
};

export type NewTask = Pick<
  Task,
  "title" | "category" | "mode" | "budget" | "location" | "deadline" | "description"
>;

type TaskStore = {
  tasks: Task[];
  ready: boolean;
  createTask: (input: NewTask) => string;
  updateTask: (id: string, input: NewTask) => void;
  deleteTask: (id: string) => void;
};

const storageKey = "taskhive.mock-tasks.v1";
let tasksSnapshot: Task[] = sampleTasks;
let initialized = false;
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(tasksSnapshot));
  } catch {
    // Keep the in-memory store usable when browser storage is unavailable.
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
        // The session can still use the in-memory sample data.
      }
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

function notify() {
  persist();
  listeners.forEach((listener) => listener());
}

function createTask(input: NewTask) {
  const id = `task_${crypto.randomUUID()}`;
  tasksSnapshot = [
    {
      ...input,
      id,
      status: "Open",
      distance: "Not set",
      poster: "Ana Reyes",
      bids: 0,
    },
    ...tasksSnapshot,
  ];
  notify();
  return id;
}

function updateTask(id: string, input: NewTask) {
  tasksSnapshot = tasksSnapshot.map((task) => (task.id === id ? { ...task, ...input } : task));
  notify();
}

function deleteTask(id: string) {
  tasksSnapshot = tasksSnapshot.filter((task) => task.id !== id);
  notify();
}

export function useMockTasks(): TaskStore {
  const tasks = useSyncExternalStore(subscribe, getTasksSnapshot, getServerTasksSnapshot);
  const ready = useSyncExternalStore(subscribe, getReadySnapshot, getServerReadySnapshot);
  return useMemo(() => ({ tasks, ready, createTask, updateTask, deleteTask }), [tasks, ready]);
}
