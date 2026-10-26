"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { TaskerVerificationStatus } from "@/lib/domain/access";
import {
  applicationsForTask,
  invalidateApplications,
  liveApplicationFor,
  submitApplication,
  withdrawApplication,
  type ApplicationFormValues,
  type ApplicationResult,
  type DemoApplication,
  type WithdrawResult,
} from "@/lib/applications/demo";
import {
  chatForTaskAndUser,
  openTaskChat,
  postChatMessage,
  reportChatMessage,
  type DemoChat,
  type OpenChatResult,
  type PostMessageResult,
  type ReportMessageResult,
} from "@/lib/chat/demo";
import { seedApplications, seedChats } from "@/lib/applications/seed";
import {
  demoAssignmentForTask,
  expireHoldIfDue,
  recordPayment,
  selectDemoTasker,
  startDemoCheckout,
  type DemoAssignment,
} from "@/lib/payments/demo";
import type { TaskSummary } from "@/lib/tasks/types";

type MarketplaceStore = {
  applications: DemoApplication[];
  chats: DemoChat[];
  assignments: DemoAssignment[];
  applicationsForTask: (taskId: string) => DemoApplication[];
  liveApplication: (taskId: string, tasker: string) => DemoApplication | null;
  submit: (input: {
    task: TaskSummary;
    tasker: string;
    verification: TaskerVerificationStatus;
    values: ApplicationFormValues;
  }) => ApplicationResult;
  withdraw: (task: TaskSummary, tasker: string, id: string) => WithdrawResult;
  invalidateForTask: (taskId: string) => void;
  chatForTask: (taskId: string, user: string) => DemoChat | null;
  openChat: (task: TaskSummary, viewer: string) => OpenChatResult;
  sendMessage: (input: {
    task: TaskSummary;
    chatId: string;
    sender: string;
    body: string;
  }) => PostMessageResult;
  reportMessage: (input: {
    chatId: string;
    messageId: string;
    reporter: string;
  }) => ReportMessageResult;
  assignmentForTask: (taskId: string) => DemoAssignment | null;
  selectTasker: (input: {
    task: TaskSummary;
    application: DemoApplication;
  }) => ReturnType<typeof selectDemoTasker>;
  startCheckout: (taskId: string) => DemoAssignment | null;
  pay: (taskId: string, outcome: "success" | "failure") => DemoAssignment | null;
  expireHold: (
    taskId: string,
    now?: Date,
  ) => { expired: boolean; assignment: DemoAssignment | null };
};

const applicationsKey = "taskhive.mock-applications.v1";
const chatsKey = "taskhive.mock-chats.v1";
const assignmentsKey = "taskhive.mock-assignments.v1";

let applicationsSnapshot: DemoApplication[] = seedApplications;
let chatsSnapshot: DemoChat[] = seedChats;
let assignmentsSnapshot: DemoAssignment[] = [];
let initialized = false;
const listeners = new Set<() => void>();

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const stored = window.sessionStorage.getItem(key);
    if (!stored) return fallback;
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function persist() {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(applicationsKey, JSON.stringify(applicationsSnapshot));
    window.sessionStorage.setItem(chatsKey, JSON.stringify(chatsSnapshot));
    window.sessionStorage.setItem(assignmentsKey, JSON.stringify(assignmentsSnapshot));
  } catch {
    // Keep the in-memory store usable when browser storage is unavailable.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!initialized && typeof window !== "undefined") {
    applicationsSnapshot = readStored(applicationsKey, seedApplications);
    chatsSnapshot = readStored(chatsKey, seedChats);
    assignmentsSnapshot = readStored(assignmentsKey, []);
    initialized = true;
    listeners.forEach((notify) => notify());
  }
  return () => listeners.delete(listener);
}

function notify() {
  persist();
  listeners.forEach((listener) => listener());
}

function getApplicationsSnapshot() {
  return applicationsSnapshot;
}

function getChatsSnapshot() {
  return chatsSnapshot;
}

function getAssignmentsSnapshot() {
  return assignmentsSnapshot;
}

function getServerApplications(): DemoApplication[] {
  return seedApplications;
}

function getServerChats(): DemoChat[] {
  return seedChats;
}

function getServerAssignments(): DemoAssignment[] {
  return [];
}

function submit(input: {
  task: TaskSummary;
  tasker: string;
  verification: TaskerVerificationStatus;
  values: ApplicationFormValues;
}): ApplicationResult {
  const result = submitApplication({
    applications: applicationsSnapshot,
    task: input.task,
    tasker: input.tasker,
    verification: input.verification,
    values: input.values,
    id: `application_${crypto.randomUUID()}`,
  });

  if (result.ok) {
    applicationsSnapshot = result.applications;
    notify();
  }

  return result;
}

function withdraw(task: TaskSummary, tasker: string, id: string): WithdrawResult {
  const result = withdrawApplication({
    applications: applicationsSnapshot,
    task,
    tasker,
    id,
  });

  if (result.ok) {
    applicationsSnapshot = result.applications;
    notify();
  }

  return result;
}

/** Mirrors the server's material-edit effect for the browser session. */
function invalidateForTask(taskId: string) {
  applicationsSnapshot = invalidateApplications(applicationsSnapshot, taskId);
  notify();
}

function openChat(task: TaskSummary, viewer: string): OpenChatResult {
  const result = openTaskChat({
    chats: chatsSnapshot,
    task,
    viewer,
    id: `chat_${crypto.randomUUID()}`,
  });

  if (result.ok) {
    chatsSnapshot = result.chats;
    notify();
  }

  return result;
}

function sendMessage(input: {
  task: TaskSummary;
  chatId: string;
  sender: string;
  body: string;
}): PostMessageResult {
  const result = postChatMessage({
    chats: chatsSnapshot,
    task: input.task,
    chatId: input.chatId,
    sender: input.sender,
    body: input.body,
    id: `message_${crypto.randomUUID()}`,
  });

  if (result.ok) {
    chatsSnapshot = result.chats;
    notify();
  }

  return result;
}

function reportMessage(input: {
  chatId: string;
  messageId: string;
  reporter: string;
}): ReportMessageResult {
  const result = reportChatMessage({
    chats: chatsSnapshot,
    ...input,
  });

  if (result.ok) {
    chatsSnapshot = result.chats;
    notify();
  }

  return result;
}

function selectTasker(input: {
  task: TaskSummary;
  application: DemoApplication;
}): ReturnType<typeof selectDemoTasker> {
  const result = selectDemoTasker({
    assignments: assignmentsSnapshot,
    task: input.task,
    application: input.application,
    id: `assignment_${crypto.randomUUID()}`,
  });

  if (!result.ok) return result;

  assignmentsSnapshot = result.assignments;
  applicationsSnapshot = applicationsSnapshot.map((application) =>
    application.id === input.application.id
      ? { ...application, status: "accepted" }
      : application,
  );
  notify();
  return result;
}

function startCheckout(taskId: string): DemoAssignment | null {
  const current = demoAssignmentForTask(assignmentsSnapshot, taskId);
  if (!current) return null;

  const next = startDemoCheckout(current);
  assignmentsSnapshot = assignmentsSnapshot.map((assignment) =>
    assignment.taskId === taskId ? next : assignment,
  );
  notify();
  return next;
}

function pay(taskId: string, outcome: "success" | "failure"): DemoAssignment | null {
  const current = demoAssignmentForTask(assignmentsSnapshot, taskId);
  if (!current) return null;

  const next = recordPayment(current, outcome);
  assignmentsSnapshot = assignmentsSnapshot.map((assignment) =>
    assignment.taskId === taskId ? next : assignment,
  );
  notify();
  return next;
}

function expireHold(
  taskId: string,
  now: Date = new Date(),
): { expired: boolean; assignment: DemoAssignment | null } {
  const current = demoAssignmentForTask(assignmentsSnapshot, taskId);
  if (!current) return { expired: false, assignment: null };

  const result = expireHoldIfDue(current, now);
  if (!result.expired) return { expired: false, assignment: current };

  assignmentsSnapshot = assignmentsSnapshot.map((assignment) =>
    assignment.taskId === taskId ? result.assignment : assignment,
  );
  applicationsSnapshot = applicationsSnapshot.map((application) =>
    application.id === current.applicationId
      ? { ...application, status: "submitted" }
      : application,
  );
  notify();
  return { expired: true, assignment: result.assignment };
}

export function useMarketplace(): MarketplaceStore {
  const applications = useSyncExternalStore(
    subscribe,
    getApplicationsSnapshot,
    getServerApplications,
  );
  const chats = useSyncExternalStore(subscribe, getChatsSnapshot, getServerChats);
  const assignments = useSyncExternalStore(
    subscribe,
    getAssignmentsSnapshot,
    getServerAssignments,
  );

  return useMemo(
    () => ({
      applications,
      chats,
      assignments,
      applicationsForTask: (taskId: string) => applicationsForTask(applications, taskId),
      liveApplication: (taskId: string, tasker: string) =>
        liveApplicationFor(applications, taskId, tasker),
      submit,
      withdraw,
      invalidateForTask,
      chatForTask: (taskId: string, user: string) =>
        chatForTaskAndUser(chats, taskId, user),
      openChat,
      sendMessage,
      reportMessage,
      assignmentForTask: (taskId: string) =>
        demoAssignmentForTask(assignments, taskId),
      selectTasker,
      startCheckout,
      pay,
      expireHold,
    }),
    [applications, chats, assignments],
  );
}
