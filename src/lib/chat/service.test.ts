import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, notifyUserMock, notifyAdminsMock } = vi.hoisted(() => ({
  prismaMock: {
    task: { findUnique: vi.fn() },
    user: { findMany: vi.fn() },
    taskChat: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    chatMessage: { create: vi.fn(), findUnique: vi.fn() },
    report: { create: vi.fn() },
  },
  notifyUserMock: vi.fn(),
  notifyAdminsMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/notifications", () => ({
  notifyUser: notifyUserMock,
  notifyAdmins: notifyAdminsMock,
}));

import {
  getChatMessages,
  listChats,
  openTaskChat,
  postChatMessage,
  reportChatMessage,
} from "./service";

const openTask = {
  id: "task_1",
  posterId: "poster_1",
  title: "Pick up groceries",
  status: "OPEN",
};

const chatRow = {
  id: "chat_1",
  taskId: "task_1",
  openerId: "tasker_1",
  createdAt: new Date("2026-10-26T08:00:00.000Z"),
  task: openTask,
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.task.findUnique.mockResolvedValue(openTask);
  prismaMock.user.findMany.mockResolvedValue([]);
  prismaMock.taskChat.upsert.mockResolvedValue(chatRow);
  prismaMock.taskChat.findUnique.mockResolvedValue(chatRow);
  prismaMock.taskChat.findMany.mockResolvedValue([]);
  prismaMock.taskChat.update.mockResolvedValue(chatRow);
  prismaMock.chatMessage.create.mockResolvedValue({
    id: "msg_1",
    senderId: "tasker_1",
    body: "Is the grocery list final?",
    createdAt: new Date("2026-10-26T08:05:00.000Z"),
  });
});

describe("opening a task chat", () => {
  it("creates or reuses the signed-in user's thread on an open task", async () => {
    const result = await openTaskChat("tasker_1", "task_1");

    expect(result).toMatchObject({ ok: true, chat: { id: "chat_1", taskId: "task_1" } });
    expect(prismaMock.taskChat.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { taskId_openerId: { taskId: "task_1", openerId: "tasker_1" } },
      }),
    );
  });

  it("refuses the Poster's own task and closed tasks", async () => {
    expect(await openTaskChat("poster_1", "task_1")).toMatchObject({
      ok: false,
      code: "own_task",
    });

    prismaMock.task.findUnique.mockResolvedValue({ ...openTask, status: "CANCELLED" });
    expect(await openTaskChat("tasker_1", "task_1")).toMatchObject({
      ok: false,
      code: "task_not_open",
    });
  });
});

describe("listing chats", () => {
  it("returns the task title and read-only state after the task closes", async () => {
    prismaMock.taskChat.findMany.mockResolvedValue([
      {
        ...chatRow,
        task: { ...openTask, status: "COMPLETED" },
        messages: [
          {
            body: "Thanks!",
            senderId: "poster_1",
            createdAt: new Date("2026-10-27T08:00:00.000Z"),
          },
        ],
      },
    ]);

    const chats = await listChats("tasker_1");

    expect(chats[0]).toMatchObject({
      id: "chat_1",
      taskTitle: "Pick up groceries",
      canPost: false,
      lastMessage: { body: "Thanks!" },
    });
    expect(prismaMock.taskChat.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ openerId: "tasker_1" }, { task: { posterId: "tasker_1" } }],
        },
      }),
    );
  });
});

describe("chat messages", () => {
  it("shows the thread to both participants", async () => {
    prismaMock.taskChat.findUnique.mockResolvedValue({
      ...chatRow,
      messages: [
        {
          id: "msg_1",
          senderId: "tasker_1",
          sender: { name: "Ana Reyes" },
          body: "Is the grocery list final?",
          createdAt: new Date("2026-10-26T08:05:00.000Z"),
        },
      ],
    });

    const asTasker = await getChatMessages("tasker_1", "chat_1");
    const asPoster = await getChatMessages("poster_1", "chat_1");

    expect(asTasker).toMatchObject({ ok: true, canPost: true });
    if (!asTasker.ok) return;
    expect(asTasker.messages[0]).toMatchObject({
      senderName: "Ana Reyes",
      body: "Is the grocery list final?",
    });
    expect(asPoster).toMatchObject({ ok: true });
  });

  it("hides the thread from everyone else", async () => {
    expect(await getChatMessages("tasker_2", "chat_1")).toMatchObject({
      ok: false,
      code: "not_participant",
    });
  });

  it("stores a participant's message and notifies the other person", async () => {
    const result = await postChatMessage("tasker_1", "chat_1", "Is the grocery list final?");

    expect(result).toMatchObject({ ok: true, message: { id: "msg_1" } });
    expect(prismaMock.chatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { chatId: "chat_1", senderId: "tasker_1", body: "Is the grocery list final?" },
      }),
    );
    expect(notifyUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "poster_1",
        type: "chat.message",
        eventKey: "chat.message:msg_1:poster_1",
      }),
    );
  });

  it("locks the thread and blocks non-participants", async () => {
    prismaMock.taskChat.findUnique.mockResolvedValue({
      ...chatRow,
      task: { ...openTask, status: "CANCELLED" },
    });
    expect(await postChatMessage("tasker_1", "chat_1", "Hello?")).toMatchObject({
      ok: false,
      code: "chat_locked",
    });

    prismaMock.taskChat.findUnique.mockResolvedValue(chatRow);
    expect(await postChatMessage("tasker_2", "chat_1", "Hello?")).toMatchObject({
      ok: false,
      code: "not_participant",
    });
  });
});

describe("reporting a chat message", () => {
  const messageRow = {
    id: "msg_1",
    senderId: "poster_1",
    body: "Inappropriate message",
    chat: { ...chatRow, task: openTask },
  };

  it("records a report tied to the message and the task", async () => {
    prismaMock.chatMessage.findUnique.mockResolvedValue(messageRow);
    prismaMock.report.create.mockResolvedValue({ id: "report_1", status: "OPEN" });

    const result = await reportChatMessage("tasker_1", "msg_1", "Abusive language");

    expect(result).toMatchObject({ ok: true, report: { id: "report_1" } });
    expect(prismaMock.report.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reporterId: "tasker_1",
          reportedUserId: "poster_1",
          taskId: "task_1",
          messageId: "msg_1",
        }),
      }),
    );
    expect(notifyAdminsMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventKey: "support.chat-report:report_1" }),
    );
  });

  it("refuses reports from people outside the conversation", async () => {
    prismaMock.chatMessage.findUnique.mockResolvedValue(messageRow);

    expect(await reportChatMessage("tasker_2", "msg_1", "Abusive language")).toMatchObject({
      ok: false,
      code: "not_participant",
    });
    expect(prismaMock.report.create).not.toHaveBeenCalled();
  });
});
