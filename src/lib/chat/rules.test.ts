import { describe, expect, it } from "vitest";
import {
  canOpenChat,
  canPostMessage,
  canReadChat,
  isChatParticipant,
  type ChatTask,
} from "./rules";

function task(overrides: Partial<ChatTask> = {}): ChatTask {
  return { posterId: "poster_1", status: "open", ...overrides };
}

const chat = { openerId: "tasker_1", posterId: "poster_1" };

describe("opening a task chat", () => {
  it("lets a signed-in user start a thread on an open task", () => {
    expect(canOpenChat({ actorId: "tasker_1", task: task() })).toEqual({ allowed: true });
  });

  it("refuses closed tasks and the Poster's own task", () => {
    for (const status of ["draft", "pending_payment", "cancelled", "completed"] as const) {
      expect(canOpenChat({ actorId: "tasker_1", task: task({ status }) })).toMatchObject({
        allowed: false,
        code: "task_not_open",
      });
    }

    expect(canOpenChat({ actorId: "poster_1", task: task() })).toMatchObject({
      allowed: false,
      code: "own_task",
    });
  });
});

describe("chat participation", () => {
  it("treats only the opener and the Poster as participants", () => {
    expect(isChatParticipant({ actorId: "tasker_1", ...chat })).toBe(true);
    expect(isChatParticipant({ actorId: "poster_1", ...chat })).toBe(true);
    expect(isChatParticipant({ actorId: "tasker_2", ...chat })).toBe(false);
  });

  it("refuses reads from anyone else", () => {
    expect(canReadChat({ actorId: "tasker_1", ...chat })).toEqual({ allowed: true });
    expect(canReadChat({ actorId: "poster_1", ...chat })).toEqual({ allowed: true });
    expect(canReadChat({ actorId: "tasker_2", ...chat })).toMatchObject({
      allowed: false,
      code: "not_participant",
    });
  });
});

describe("posting a message", () => {
  it("lets participants write while the task is open", () => {
    expect(
      canPostMessage({ actorId: "tasker_1", ...chat, taskStatus: "open" }),
    ).toEqual({ allowed: true });
    expect(
      canPostMessage({ actorId: "poster_1", ...chat, taskStatus: "open" }),
    ).toEqual({ allowed: true });
  });

  it("makes the thread read-only when the task is no longer open", () => {
    for (const taskStatus of ["pending_payment", "assigned", "cancelled", "completed"] as const) {
      expect(
        canPostMessage({ actorId: "tasker_1", ...chat, taskStatus }),
      ).toMatchObject({ allowed: false, code: "chat_locked" });
    }
  });

  it("refuses writes from non-participants", () => {
    expect(
      canPostMessage({ actorId: "tasker_2", ...chat, taskStatus: "open" }),
    ).toMatchObject({ allowed: false, code: "not_participant" });
  });
});
