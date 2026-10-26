import { describe, expect, it } from "vitest";
import {
  canReadDemoChat,
  chatForTaskAndUser,
  chatsForUser,
  formatChatTime,
  lastMessage,
  messageError,
  openTaskChat,
  postChatMessage,
  reportChatMessage,
  type DemoChat,
} from "./demo";
import type { TaskSummary } from "@/lib/tasks/types";

const now = new Date("2026-10-26T10:00:00.000Z");

function task(overrides: Partial<TaskSummary> = {}): TaskSummary {
  return {
    id: "task_1",
    title: "Pick up groceries",
    description: "Buy groceries and deliver them nearby.",
    category: "Delivery",
    fulfillmentMode: "local",
    hiringMode: "bidding",
    status: "open",
    budget: 450,
    location: "Sampaloc, Manila",
    deadline: "2026-11-02T17:00:00+08:00",
    poster: "Maria Santos",
    applications: 0,
    ...overrides,
  };
}

function chat(overrides: Partial<DemoChat> = {}): DemoChat {
  return {
    id: "chat_1",
    taskId: "task_1",
    opener: "Ana Reyes",
    poster: "Maria Santos",
    createdAt: now.toISOString(),
    messages: [],
    ...overrides,
  };
}

describe("chat messages", () => {
  it("rejects empty and overlong messages", () => {
    expect(messageError("Hello there")).toBeNull();
    expect(messageError("   ")).toBeDefined();
    expect(messageError("x".repeat(2001))).toBeDefined();
  });
});

describe("opening a chat", () => {
  it("creates a thread on an open task and reuses it afterwards", () => {
    const first = openTaskChat({
      chats: [],
      task: task(),
      viewer: "Ana Reyes",
      id: "chat_new",
      now,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.chat).toMatchObject({
      id: "chat_new",
      opener: "Ana Reyes",
      poster: "Maria Santos",
      messages: [],
    });

    const second = openTaskChat({
      chats: first.chats,
      task: task(),
      viewer: "Ana Reyes",
      id: "chat_other",
      now,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.chats).toHaveLength(1);
    expect(second.chat.id).toBe("chat_new");
  });

  it("refuses closed tasks and the Poster's own task", () => {
    expect(
      openTaskChat({ chats: [], task: task({ status: "cancelled" }), viewer: "Ana Reyes", id: "chat_new" }),
    ).toMatchObject({ ok: false, reason: expect.stringMatching(/open/i) });
    expect(
      openTaskChat({ chats: [], task: task(), viewer: "Maria Santos", id: "chat_new" }),
    ).toMatchObject({ ok: false, reason: expect.stringMatching(/yourself/i) });
  });
});

describe("posting messages", () => {
  it("lets both participants talk while the task is open", () => {
    const fromTasker = postChatMessage({
      chats: [chat()],
      task: task(),
      chatId: "chat_1",
      sender: "Ana Reyes",
      body: "Is the grocery list final?",
      id: "msg_1",
      now,
    });
    expect(fromTasker.ok).toBe(true);
    if (!fromTasker.ok) return;

    const fromPoster = postChatMessage({
      chats: fromTasker.chats,
      task: task(),
      chatId: "chat_1",
      sender: "Maria Santos",
      body: "Yes, it is final.",
      id: "msg_2",
      now: new Date("2026-10-26T10:05:00.000Z"),
    });

    expect(fromPoster.ok).toBe(true);
    if (!fromPoster.ok) return;
    expect(fromPoster.chats[0].messages.map((message) => message.body)).toEqual([
      "Is the grocery list final?",
      "Yes, it is final.",
    ]);
  });

  it("locks writes once the task closes and blocks strangers", () => {
    expect(
      postChatMessage({
        chats: [chat()],
        task: task({ status: "cancelled" }),
        chatId: "chat_1",
        sender: "Ana Reyes",
        body: "Hello?",
        id: "msg_1",
      }),
    ).toMatchObject({ ok: false });
    expect(
      postChatMessage({
        chats: [chat()],
        task: task(),
        chatId: "chat_1",
        sender: "Lia Ramos",
        body: "Hello?",
        id: "msg_1",
      }),
    ).toMatchObject({ ok: false, reason: expect.stringMatching(/participants/i) });
  });
});

describe("reporting messages", () => {
  const withMessage = chat({
    messages: [
      {
        id: "msg_1",
        sender: "Maria Santos",
        body: "Inappropriate message",
        createdAt: now.toISOString(),
        reported: false,
      },
    ],
  });

  it("marks a message reported by the other participant", () => {
    const result = reportChatMessage({
      chats: [withMessage],
      chatId: "chat_1",
      messageId: "msg_1",
      reporter: "Ana Reyes",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.chats[0].messages[0].reported).toBe(true);
  });

  it("refuses reports from strangers and for your own message", () => {
    expect(
      reportChatMessage({
        chats: [withMessage],
        chatId: "chat_1",
        messageId: "msg_1",
        reporter: "Lia Ramos",
      }),
    ).toMatchObject({ ok: false });

    const ownMessage = chat({
      messages: [
        {
          id: "msg_2",
          sender: "Ana Reyes",
          body: "Mine",
          createdAt: now.toISOString(),
          reported: false,
        },
      ],
    });
    expect(
      reportChatMessage({
        chats: [ownMessage],
        chatId: "chat_1",
        messageId: "msg_2",
        reporter: "Ana Reyes",
      }),
    ).toMatchObject({ ok: false, reason: expect.stringMatching(/your own/i) });
  });
});

describe("chat views", () => {
  it("lists a user's threads with the newest first", () => {
    const older = chat({ id: "older", createdAt: "2026-10-25T10:00:00.000Z" });
    const newer = chat({
      id: "newer",
      createdAt: "2026-10-26T09:00:00.000Z",
      messages: [
        {
          id: "msg_1",
          sender: "Maria Santos",
          body: "Thanks!",
          createdAt: "2026-10-26T09:30:00.000Z",
          reported: false,
        },
      ],
    });

    expect(chatsForUser([older, newer], "Ana Reyes").map((item) => item.id)).toEqual([
      "newer",
      "older",
    ]);
    expect(chatsForUser([older, newer], "Maria Santos")).toHaveLength(2);
    expect(chatsForUser([older, newer], "Lia Ramos")).toEqual([]);
    expect(chatForTaskAndUser([older, newer], "task_1", "Ana Reyes")?.id).toBe("newer");
    expect(lastMessage(newer)?.body).toBe("Thanks!");
  });

  it("keeps history readable for participants after the task closes", () => {
    expect(canReadDemoChat(chat(), "Ana Reyes")).toBe(true);
    expect(canReadDemoChat(chat(), "Maria Santos")).toBe(true);
    expect(canReadDemoChat(chat(), "Lia Ramos")).toBe(false);
  });

  it("formats message times for the day they were sent", () => {
    expect(formatChatTime("2026-10-26T10:05:00.000Z")).toMatch(/Oct 26/);
    expect(formatChatTime("not-a-date")).toBe("");
  });
});
