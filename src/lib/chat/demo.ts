import type { TaskSummary } from "@/lib/tasks/types";
import { canOpenChat, canPostMessage, canReadChat } from "./rules";

export type DemoChatMessage = {
  id: string;
  sender: string;
  body: string;
  createdAt: string;
  reported: boolean;
};

export type DemoChat = {
  id: string;
  taskId: string;
  opener: string;
  poster: string;
  createdAt: string;
  messages: DemoChatMessage[];
};

export function messageError(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return "Write a message before sending.";
  if (trimmed.length > 2000) return "Keep messages to 2,000 characters or fewer.";
  return null;
}

export type OpenChatResult =
  | { ok: true; chats: DemoChat[]; chat: DemoChat }
  | { ok: false; reason: string };

export function openTaskChat(input: {
  chats: readonly DemoChat[];
  task: TaskSummary;
  viewer: string;
  id: string;
  now?: Date;
}): OpenChatResult {
  const decision = canOpenChat({
    actorId: input.viewer,
    task: { posterId: input.task.poster, status: input.task.status },
  });

  if (!decision.allowed) return { ok: false, reason: decision.reason };

  const existing = input.chats.find(
    (chat) => chat.taskId === input.task.id && chat.opener === input.viewer,
  );

  if (existing) return { ok: true, chats: [...input.chats], chat: existing };

  const chat: DemoChat = {
    id: input.id,
    taskId: input.task.id,
    opener: input.viewer,
    poster: input.task.poster,
    createdAt: (input.now ?? new Date()).toISOString(),
    messages: [],
  };

  return { ok: true, chats: [...input.chats, chat], chat };
}

export type PostMessageResult =
  | { ok: true; chats: DemoChat[]; message: DemoChatMessage }
  | { ok: false; reason: string };

export function postChatMessage(input: {
  chats: readonly DemoChat[];
  task: TaskSummary;
  chatId: string;
  sender: string;
  body: string;
  id: string;
  now?: Date;
}): PostMessageResult {
  const chat = input.chats.find((item) => item.id === input.chatId);
  if (!chat) return { ok: false, reason: "Conversation not found." };

  const decision = canPostMessage({
    actorId: input.sender,
    openerId: chat.opener,
    posterId: chat.poster,
    taskStatus: input.task.status,
  });

  if (!decision.allowed) return { ok: false, reason: decision.reason };

  const error = messageError(input.body);
  if (error) return { ok: false, reason: error };

  const message: DemoChatMessage = {
    id: input.id,
    sender: input.sender,
    body: input.body.trim(),
    createdAt: (input.now ?? new Date()).toISOString(),
    reported: false,
  };

  return {
    ok: true,
    message,
    chats: input.chats.map((item) =>
      item.id === chat.id ? { ...item, messages: [...item.messages, message] } : item,
    ),
  };
}

export type ReportMessageResult =
  | { ok: true; chats: DemoChat[] }
  | { ok: false; reason: string };

export function reportChatMessage(input: {
  chats: readonly DemoChat[];
  chatId: string;
  messageId: string;
  reporter: string;
}): ReportMessageResult {
  const chat = input.chats.find((item) => item.id === input.chatId);
  if (!chat) return { ok: false, reason: "Conversation not found." };

  const decision = canReadChat({
    actorId: input.reporter,
    openerId: chat.opener,
    posterId: chat.poster,
  });
  if (!decision.allowed) return { ok: false, reason: decision.reason };

  const message = chat.messages.find((item) => item.id === input.messageId);
  if (!message) return { ok: false, reason: "Message not found." };
  if (message.sender === input.reporter) {
    return { ok: false, reason: "You cannot report your own message." };
  }

  return {
    ok: true,
    chats: input.chats.map((item) =>
      item.id === chat.id
        ? {
            ...item,
            messages: item.messages.map((entry) =>
              entry.id === message.id ? { ...entry, reported: true } : entry,
            ),
          }
        : item,
    ),
  };
}

export function lastMessage(chat: DemoChat): DemoChatMessage | null {
  return chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null;
}

function lastActivity(chat: DemoChat): number {
  return new Date(lastMessage(chat)?.createdAt ?? chat.createdAt).getTime();
}

export function chatsForUser(
  chats: readonly DemoChat[],
  user: string,
): DemoChat[] {
  return chats
    .filter((chat) => chat.opener === user || chat.poster === user)
    .sort((a, b) => lastActivity(b) - lastActivity(a));
}

/** The Poster may have many threads per task; they open the first one. */
export function chatForTaskAndUser(
  chats: readonly DemoChat[],
  taskId: string,
  user: string,
): DemoChat | null {
  const forTask = chats.filter((chat) => chat.taskId === taskId);
  const opened = forTask
    .filter((chat) => chat.opener === user)
    .sort((a, b) => lastActivity(b) - lastActivity(a));

  return opened[0] ?? forTask.find((chat) => chat.poster === user) ?? null;
}

export function canReadDemoChat(chat: DemoChat, user: string): boolean {
  return canReadChat({ actorId: user, openerId: chat.opener, posterId: chat.poster })
    .allowed;
}

export function formatChatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  });
}
