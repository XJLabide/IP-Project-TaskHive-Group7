import { describe, expect, it } from "vitest";
import { groupTasksByLocation, mappableTasks } from "./task-map";
import type { TaskSummary } from "@/lib/tasks/types";

const base: TaskSummary = {
  id: "task_1",
  title: "Task",
  category: "Errands",
  fulfillmentMode: "local",
  hiringMode: "bidding",
  status: "open",
  budget: 500,
  location: "Manila",
  latitude: 14.6,
  longitude: 121,
  poster: "Poster",
  description: "Description",
  applications: 0,
  deadline: "",
};

describe("task map data", () => {
  it("keeps only open local tasks with valid coordinates", () => {
    expect(
      mappableTasks([
        base,
        { ...base, id: "remote", fulfillmentMode: "remote", latitude: null, longitude: null },
        { ...base, id: "draft", status: "draft" },
        { ...base, id: "missing", latitude: null },
      ]).map((task) => task.id),
    ).toEqual(["task_1"]);
  });

  it("groups tasks at the same location", () => {
    const grouped = groupTasksByLocation(
      mappableTasks([
        base,
        { ...base, id: "task_2", title: "Second task" },
        { ...base, id: "task_3", latitude: 14.7 },
      ]),
    );
    expect(grouped).toHaveLength(2);
    expect(grouped[0].tasks.map((task) => task.id)).toEqual(["task_1", "task_2"]);
  });
});
