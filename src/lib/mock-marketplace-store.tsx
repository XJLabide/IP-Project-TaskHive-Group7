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
import type { TaskSummary } from "@/lib/tasks/types";

type MarketplaceStore = {
  applications: DemoApplication[];
  chats: DemoChat[];
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
};

const applicationsKey = "taskhive.mock-applications.v1";
const chatsKey = "taskhive.mock-chats.v1";

let applicationsSnapshot: DemoApplication[] = seedApplications;
let chatsSnapshot: DemoChat[] = seedChats;
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
  } catch {
    // Keep the in-memory store usable when browser storage is unavailable.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!initialized && typeof window !== "undefined") {
    applicationsSnapshot = readStored(applicationsKey, seedApplications);
    chatsSnapshot = readStored(chatsKey, seedChats);
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

function getServerApplications(): DemoApplication[] {
  return seedApplications;
}

function getServerChats(): DemoChat[] {
  return seedChats;
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

export function useMarketplace(): MarketplaceStore {
  const applications = useSyncExternalStore(
    subscribe,
    getApplicationsSnapshot,
    getServerApplications,
  );
  const chats = useSyncExternalStore(subscribe, getChatsSnapshot, getServerChats);

  return useMemo(
    () => ({
      applications,
      chats,
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
    }),
    [applications, chats],
  );
}
