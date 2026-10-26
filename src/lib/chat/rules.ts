import type { TaskLifecycleStatus } from "@/lib/tasks/lifecycle";

export type ChatTask = {
  posterId: string;
  status: TaskLifecycleStatus;
};

export type ChatDenialCode =
  | "task_not_open"
  | "own_task"
  | "not_participant"
  | "chat_locked";

export type ChatDecision =
  | { allowed: true }
  | { allowed: false; code: ChatDenialCode; reason: string };

const ALLOWED: ChatDecision = { allowed: true };

function deny(code: ChatDenialCode, reason: string): ChatDecision {
  return { allowed: false, code, reason };
}

/** A task chat exists only for an open task and only between two people. */
export function canOpenChat(input: {
  actorId: string;
  task: ChatTask;
}): ChatDecision {
  if (input.task.status !== "open") {
    return deny("task_not_open", "You can only message the Poster while the task is open.");
  }

  if (input.actorId === input.task.posterId) {
    return deny("own_task", "You cannot open a task conversation with yourself.");
  }

  return ALLOWED;
}

export function isChatParticipant(input: {
  actorId: string;
  openerId: string;
  posterId: string;
}): boolean {
  return input.actorId === input.openerId || input.actorId === input.posterId;
}

/** Participants keep read access after the task closes, for history. */
export function canReadChat(input: {
  actorId: string;
  openerId: string;
  posterId: string;
}): ChatDecision {
  if (!isChatParticipant(input)) {
    return deny("not_participant", "Only the conversation participants can read it.");
  }

  return ALLOWED;
}

/** New messages stop when the task leaves the open state. */
export function canPostMessage(input: {
  actorId: string;
  openerId: string;
  posterId: string;
  taskStatus: TaskLifecycleStatus;
}): ChatDecision {
  if (!isChatParticipant(input)) {
    return deny("not_participant", "Only the conversation participants can write.");
  }

  if (input.taskStatus !== "open") {
    return deny(
      "chat_locked",
      "This task is no longer open, so the conversation is read-only.",
    );
  }

  return ALLOWED;
}
