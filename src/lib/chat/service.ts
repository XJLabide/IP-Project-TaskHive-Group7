import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notifications";
import { publishJob } from "@/lib/queue/qstash";
import type { TaskStatus as DbTaskStatus } from "@prisma/client";
import { toDomainTaskStatus } from "@/lib/tasks/mapping";
import type { TaskLifecycleStatus } from "@/lib/tasks/lifecycle";
import {
  canOpenChat,
  canPostMessage,
  canReadChat,
  type ChatDecision,
  type ChatDenialCode,
} from "./rules";

export type ChatFailureCode = ChatDenialCode | "not_found" | "forbidden";

export type ChatFailure = { ok: false; code: ChatFailureCode; reason: string };

export type ChatMessageView = {
  id: string;
  senderId: string;
  senderName: string | null;
  body: string;
  createdAt: Date;
};

export type ChatSummary = {
  id: string;
  taskId: string;
  taskTitle: string;
  posterId: string;
  openerId: string;
  taskStatus: TaskLifecycleStatus;
  canPost: boolean;
  lastMessage: {
    body: string;
    senderId: string;
    createdAt: Date;
  } | null;
};

export type OpenChatResult = { ok: true; chat: ChatSummary } | ChatFailure;
export type ChatThread =
  | {
      ok: true;
      chat: ChatSummary;
      messages: ChatMessageView[];
      canPost: boolean;
    }
  | ChatFailure;
export type PostMessageResult =
  | { ok: true; message: ChatMessageView }
  | ChatFailure;
export type ReportMessageResult =
  | { ok: true; report: { id: string; status: string } }
  | ChatFailure;

function failure(code: ChatFailureCode, reason: string): ChatFailure {
  return { ok: false, code, reason };
}

function denied(decision: ChatDecision): ChatFailure {
  if (decision.allowed) throw new Error("Expected a denied chat decision.");
  return failure(decision.code, decision.reason);
}

type ChatTaskRow = {
  id: string;
  posterId: string;
  title: string;
  status: DbTaskStatus;
};

function summary(input: {
  chat: { id: string; taskId: string; openerId: string };
  task: ChatTaskRow;
  lastMessage?: { body: string; senderId: string; createdAt: Date } | null;
}): ChatSummary {
  const taskStatus = toDomainTaskStatus[input.task.status];

  return {
    id: input.chat.id,
    taskId: input.chat.taskId,
    taskTitle: input.task.title,
    posterId: input.task.posterId,
    openerId: input.chat.openerId,
    taskStatus,
    canPost: taskStatus === "open",
    lastMessage: input.lastMessage ?? null,
  };
}

/** Opens (or reuses) the signed-in user's thread with the Poster. */
export async function openTaskChat(
  actorId: string,
  taskId: string,
): Promise<OpenChatResult> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, posterId: true, title: true, status: true },
  });

  if (!task) return failure("not_found", "Task not found.");

  const decision = canOpenChat({
    actorId,
    task: { posterId: task.posterId, status: toDomainTaskStatus[task.status] },
  });
  if (!decision.allowed) return denied(decision);

  const chat = await prisma.taskChat.upsert({
    where: { taskId_openerId: { taskId, openerId: actorId } },
    update: {},
    create: { taskId, openerId: actorId },
    select: { id: true, taskId: true, openerId: true },
  });

  return { ok: true, chat: summary({ chat, task }) };
}

/** Every thread the user takes part in, as opener or as the Poster. */
export async function listChats(userId: string): Promise<ChatSummary[]> {
  const chats = await prisma.taskChat.findMany({
    where: {
      OR: [{ openerId: userId }, { task: { posterId: userId } }],
    },
    include: {
      task: { select: { id: true, posterId: true, title: true, status: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, senderId: true, createdAt: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return chats.map((chat) =>
    summary({
      chat,
      task: chat.task,
      lastMessage: chat.messages[0] ?? null,
    }),
  );
}

type ChatRecord = {
  id: string;
  taskId: string;
  openerId: string;
  task: ChatTaskRow;
};

async function loadChat(chatId: string): Promise<ChatRecord | null> {
  return prisma.taskChat.findUnique({
    where: { id: chatId },
    select: {
      id: true,
      taskId: true,
      openerId: true,
      task: { select: { id: true, posterId: true, title: true, status: true } },
    },
  });
}

/** Participants can always read history; only an open task can gain messages. */
export async function getChatMessages(
  actorId: string,
  chatId: string,
): Promise<ChatThread> {
  const chat = await prisma.taskChat.findUnique({
    where: { id: chatId },
    include: {
      task: { select: { id: true, posterId: true, title: true, status: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          senderId: true,
          sender: { select: { name: true } },
          body: true,
          createdAt: true,
        },
      },
    },
  });

  if (!chat) return failure("not_found", "Conversation not found.");

  const decision = canReadChat({
    actorId,
    openerId: chat.openerId,
    posterId: chat.task.posterId,
  });
  if (!decision.allowed) return denied(decision);

  const taskStatus = toDomainTaskStatus[chat.task.status];

  return {
    ok: true,
    chat: summary({ chat, task: chat.task }),
    canPost: taskStatus === "open",
    messages: chat.messages.map((message) => ({
      id: message.id,
      senderId: message.senderId,
      senderName: message.sender?.name ?? null,
      body: message.body,
      createdAt: message.createdAt,
    })),
  };
}

/** Adds a message while the task is open and notifies the other participant. */
export async function postChatMessage(
  actorId: string,
  chatId: string,
  body: string,
): Promise<PostMessageResult> {
  const chat = await loadChat(chatId);
  if (!chat) return failure("not_found", "Conversation not found.");

  const decision = canPostMessage({
    actorId,
    openerId: chat.openerId,
    posterId: chat.task.posterId,
    taskStatus: toDomainTaskStatus[chat.task.status],
  });
  if (!decision.allowed) return denied(decision);

  const message = await prisma.chatMessage.create({
    data: { chatId, senderId: actorId, body: body.trim() },
    select: {
      id: true,
      senderId: true,
      body: true,
      createdAt: true,
    },
  });

  await prisma.taskChat.update({
    where: { id: chatId },
    data: { updatedAt: new Date() },
  });

  const recipientId = actorId === chat.openerId ? chat.task.posterId : chat.openerId;

  await notifyUser({
    userId: recipientId,
    type: "chat.message",
    title: "New message about a task",
    job: "notify.chat.message",
    jobBody: { chatId, senderId: actorId },
  });

  return {
    ok: true,
    message: { ...message, senderName: null },
  };
}

/** Reports a message to Admins and keeps the message reference for review. */
export async function reportChatMessage(
  reporterId: string,
  messageId: string,
  reason: string,
): Promise<ReportMessageResult> {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      senderId: true,
      body: true,
      chat: {
        select: {
          taskId: true,
          openerId: true,
          task: { select: { id: true, posterId: true, title: true, status: true } },
        },
      },
    },
  });

  if (!message) return failure("not_found", "Message not found.");

  const decision = canReadChat({
    actorId: reporterId,
    openerId: message.chat.openerId,
    posterId: message.chat.task.posterId,
  });
  if (!decision.allowed) return denied(decision);

  const report = await prisma.report.create({
    data: {
      reporterId,
      reportedUserId: message.senderId,
      taskId: message.chat.taskId,
      messageId: message.id,
      reason: reason.trim(),
    },
    select: { id: true, status: true },
  });

  try {
    await publishJob("notify.report.created", {
      reportId: report.id,
      reporterId,
      reportedUserId: message.senderId,
      taskId: message.chat.taskId,
      messageId: message.id,
    });
  } catch {
    // The report is committed; admin delivery can retry.
  }

  return { ok: true, report };
}
