import { describe, expect, it } from "vitest";
import type { TaskSummary } from "./types";
import { toTaskFields, toTaskFormValues, type TaskFormValues } from "./ui";
import {
  applyCancelTask,
  applyCreateTask,
  applyDeleteTask,
  applyUpdateTask,
} from "./ui-store";

const now = new Date("2026-10-26T00:00:00.000Z");

const openTask: TaskSummary = {
  id: "task_1",
  title: "Pick up groceries",
  description: "Buy groceries and deliver them nearby.",
  category: "Delivery",
  fulfillmentMode: "local",
  hiringMode: "bidding",
  status: "open",
  budget: 450,
  location: "Community Market",
  addressLine: "1234 Rizal Street, Sampaloc, Manila",
  latitude: 14.603,
  longitude: 120.994,
  deadline: "2026-11-01T09:00:00.000Z",
  poster: "Ana Reyes",
  applications: 4,
};

function fields(overrides: Partial<TaskFormValues> = {}) {
  return toTaskFields({ ...toTaskFormValues(openTask), ...overrides });
}

describe("mock task mutations", () => {
  it("saves an incomplete draft without publishing it", () => {
    const { tasks, result } = applyCreateTask(
      [],
      toTaskFields({
        ...toTaskFormValues(openTask),
        title: "",
        description: "",
        category: "",
        budget: "",
        location: "",
        deadline: "",
      }),
      false,
      { id: "task_new", now },
    );

    expect(result).toMatchObject({ ok: true, status: "draft" });
    expect(tasks[0]).toMatchObject({
      id: "task_new",
      status: "draft",
      applications: 0,
      latitude: 14.603,
      longitude: 120.994,
    });
  });

  it("blocks publishing an incomplete task", () => {
    const { result } = applyCreateTask(
      [],
      toTaskFields({ ...toTaskFormValues(openTask), title: "" }),
      true,
      { id: "task_new", now },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors?.title).toBeDefined();
  });

  it("publishes a complete draft", () => {
    const draft: TaskSummary = { ...openTask, status: "draft", applications: 0 };
    const { tasks, result } = applyUpdateTask(tasksOf(draft), "task_1", fields(), {
      publish: true,
      now,
    });

    expect(result).toMatchObject({ ok: true, status: "open" });
    expect(tasks[0].status).toBe("open");
  });

  it("resets applications after a material edit on an open task", () => {
    const { tasks, result } = applyUpdateTask(tasksOf(openTask), "task_1", fields({ budget: "500" }), {
      now,
    });

    expect(result).toMatchObject({ ok: true, clearedApplications: 4 });
    expect(tasks[0]).toMatchObject({ budget: 500, applications: 0 });
  });

  it("keeps applications for a non-material edit", () => {
    const { tasks, result } = applyUpdateTask(tasksOf(openTask), "task_1", fields({ category: "Cleaning" }), {
      now,
    });

    expect(result).toMatchObject({ ok: true, clearedApplications: 0 });
    expect(tasks[0].applications).toBe(4);
  });

  it("restores the service area when a remote task becomes local", () => {
    const remote: TaskSummary = {
      ...openTask,
      category: "Writing",
      fulfillmentMode: "remote",
      location: null,
    };

    const { tasks } = applyUpdateTask(
      tasksOf(remote),
      "task_1",
      toTaskFields({
        ...toTaskFormValues(remote),
        fulfillmentMode: "local",
        category: "Delivery",
        location: "Community Market",
      }),
      { now },
    );

    expect(tasks[0]).toMatchObject({
      fulfillmentMode: "local",
      location: "Community Market",
      latitude: 14.603,
      longitude: 120.994,
    });
  });

  it("clears saved coordinates when a local task becomes remote", () => {
    const { tasks } = applyUpdateTask(
      tasksOf(openTask),
      "task_1",
      toTaskFields({
        ...toTaskFormValues(openTask),
        fulfillmentMode: "remote",
        category: "Writing",
        location: "",
        address: "",
        latitude: null,
        longitude: null,
      }),
      { now },
    );

    expect(tasks[0]).toMatchObject({
      fulfillmentMode: "remote",
      location: null,
      latitude: null,
      longitude: null,
      addressLine: null,
    });
  });

  it("cancels an open task and retains its applications", () => {
    const { tasks, result } = applyCancelTask(tasksOf(openTask), "task_1");

    expect(result).toMatchObject({ ok: true, status: "cancelled" });
    expect(tasks[0]).toMatchObject({ status: "cancelled", applications: 4 });
  });

  it("refuses to delete a published task", () => {
    const { tasks, result } = applyDeleteTask(tasksOf(openTask), "task_1");

    expect(result).toMatchObject({ ok: false });
    expect(tasks).toHaveLength(1);
  });

  it("deletes a draft and refuses to edit a cancelled task", () => {
    const draft: TaskSummary = { ...openTask, status: "draft" };
    expect(applyDeleteTask(tasksOf(draft), "task_1").tasks).toEqual([]);

    const cancelled: TaskSummary = { ...openTask, status: "cancelled" };
    const { result } = applyUpdateTask(tasksOf(cancelled), "task_1", fields(), { now });
    expect(result.ok).toBe(false);
  });
});

function tasksOf(task: TaskSummary): TaskSummary[] {
  return [task];
}
