import { describe, expect, it } from "vitest";
import {
  DEFAULT_BROWSE_RADIUS_KM,
  browsePublicTasks,
  browseSearchArea,
  defaultOrigin,
  searchOrigins,
  formatBrowseDistance,
  type BrowseFilters,
} from "./browse";
import type { SearchArea } from "./location";
import { tasks as sampleTasks } from "@/lib/sample-data";
import type { TaskSummary } from "./types";

const now = new Date("2026-10-26T00:00:00.000Z");
const origin = { latitude: 14.5995, longitude: 120.9842 };

const anywhere: SearchArea = {
  origin: null,
  radiusKm: DEFAULT_BROWSE_RADIUS_KM,
  source: "nationwide",
  label: null,
};

function area(overrides: Partial<SearchArea> = {}): SearchArea {
  return {
    origin,
    radiusKm: DEFAULT_BROWSE_RADIUS_KM,
    source: "chosen",
    label: null,
    ...overrides,
  };
}

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
    latitude: 14.62,
    longitude: 121.0,
    deadline: "2026-10-30T17:00:00+08:00",
    poster: "Maria Santos",
    applications: 4,
    ...overrides,
  };
}

function filters(overrides: Partial<BrowseFilters> = {}): BrowseFilters {
  return {
    search: "",
    category: "All categories",
    budget: "any",
    deadline: "any",
    quick: "all",
    sort: "recommended",
    ...overrides,
  };
}

function ids(result: ReturnType<typeof browsePublicTasks>): string[] {
  return result.tasks.map((item) => item.task.id);
}

describe("browse search area", () => {
  it("exports a 10 km default around the saved location", () => {
    expect(DEFAULT_BROWSE_RADIUS_KM).toBe(10);
    expect(defaultOrigin).toMatchObject({ id: "saved", label: "My saved location (demo)" });
    expect(searchOrigins[0]).toBe(defaultOrigin);
  });

  it("keeps local tasks inside the radius and remote tasks without a distance", () => {
    const near = task({ id: "near" });
    const far = task({ id: "far", latitude: 14.9, longitude: 121.4 });
    const remote = task({
      id: "remote",
      fulfillmentMode: "remote",
      location: null,
      latitude: null,
      longitude: null,
    });

    const result = browsePublicTasks([near, far, remote], filters(), area());

    expect(ids(result)).toEqual(["near", "remote"]);
    expect(result.tasks[0].distanceKm).toBeGreaterThan(0);
    expect(result.tasks[1].distanceKm).toBeNull();
  });

  it("honours a tighter chosen radius", () => {
    const near = task({ id: "near" });
    const fiveKm = task({ id: "five", latitude: 14.645, longitude: 120.9842 });

    expect(ids(browsePublicTasks([near, fiveKm], filters(), area({ radiusKm: 3 })))).toEqual([
      "near",
    ]);
  });

  it("keeps every task without a distance when browsing anywhere", () => {
    const result = browsePublicTasks(
      [task(), task({ id: "remote", fulfillmentMode: "remote" })],
      filters(),
      anywhere,
    );

    expect(result.tasks).toHaveLength(2);
    expect(result.tasks.every((item) => item.distanceKm === null)).toBe(true);
  });

  it("stays nationwide when a signed-in Tasker chooses anywhere", () => {
    expect(
      browseSearchArea({ mode: "anywhere", saved: defaultOrigin, radiusKm: 10 }),
    ).toEqual({ origin: null, radiusKm: 10, source: "nationwide", label: null });
  });

  it("uses the saved location by default and the chosen origin on request", () => {
    expect(
      browseSearchArea({ mode: "saved", saved: defaultOrigin, radiusKm: 10 }),
    ).toMatchObject({
      source: "saved",
      radiusKm: 10,
      origin: { latitude: defaultOrigin.latitude, longitude: defaultOrigin.longitude },
    });

    expect(
      browseSearchArea({
        mode: "chosen",
        origin: searchOrigins[1],
        saved: defaultOrigin,
        radiusKm: 5,
      }),
    ).toMatchObject({
      source: "chosen",
      radiusKm: 5,
      origin: { latitude: searchOrigins[1].latitude, longitude: searchOrigins[1].longitude },
    });
  });

  it("keeps local tasks without coordinates visible but unranked", () => {
    const result = browsePublicTasks(
      [task({ latitude: null, longitude: null })],
      filters(),
      area(),
    );

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].distanceKm).toBeNull();
  });
});

describe("browse filters", () => {
  it("applies the quick mode filters", () => {
    const local = task({ id: "local" });
    const remote = task({ id: "remote", fulfillmentMode: "remote", latitude: null, longitude: null, location: null });
    const fixed = task({ id: "fixed", hiringMode: "fixed_price" });

    expect(ids(browsePublicTasks([local, remote, fixed], filters({ quick: "local" }), anywhere))).toEqual(["local", "fixed"]);
    expect(ids(browsePublicTasks([local, remote, fixed], filters({ quick: "remote" }), anywhere))).toEqual(["remote"]);
    expect(ids(browsePublicTasks([local, remote, fixed], filters({ quick: "bidding" }), anywhere))).toEqual(["local", "remote"]);
    expect(ids(browsePublicTasks([local, remote, fixed], filters({ quick: "fixed-price" }), anywhere))).toEqual(["fixed"]);
  });

  it("matches category and search text like the discovery API", () => {
    const delivery = task({ id: "delivery" });
    const cleaning = task({
      id: "cleaning",
      category: "Cleaning",
      title: "Clean storage room",
      description: "Clean and organize a small storage room.",
      location: "North Community Hall",
    });

    expect(ids(browsePublicTasks([delivery, cleaning], filters({ category: "Cleaning" }), anywhere))).toEqual(["cleaning"]);
    expect(ids(browsePublicTasks([delivery, cleaning], filters({ search: "groceries" }), anywhere))).toEqual(["delivery"]);
    expect(ids(browsePublicTasks([delivery, cleaning], filters({ search: "sampaloc" }), anywhere))).toEqual(["delivery"]);
  });

  it("maps budget buckets to inclusive price ranges", () => {
    const cheap = task({ id: "cheap", budget: 300 });
    const mid = task({ id: "mid", budget: 500 });
    const top = task({ id: "top", budget: 1200 });

    expect(ids(browsePublicTasks([cheap, mid, top], filters({ budget: "under-500" }), anywhere))).toEqual(["cheap"]);
    expect(ids(browsePublicTasks([cheap, mid, top], filters({ budget: "500-1000" }), anywhere))).toEqual(["mid"]);
    expect(ids(browsePublicTasks([cheap, mid, top], filters({ budget: "over-1000" }), anywhere))).toEqual(["top"]);
  });

  it("filters by the deadline window relative to now", () => {
    const soon = task({ id: "soon", deadline: "2026-10-27T17:00:00+08:00" });
    const later = task({ id: "later", deadline: "2026-11-10T17:00:00+08:00" });
    const none = task({ id: "none", deadline: "" });
    const all = [soon, later, none];

    expect(ids(browsePublicTasks(all, filters({ deadline: "3-days" }), anywhere, { now }))).toEqual(["soon"]);
    expect(ids(browsePublicTasks(all, filters({ deadline: "7-days" }), anywhere, { now }))).toEqual(["soon"]);
    expect(ids(browsePublicTasks(all, filters({ deadline: "30-days" }), anywhere, { now }))).toEqual(["soon", "later"]);
    expect(ids(browsePublicTasks(all, filters({ deadline: "any" }), anywhere, { now }))).toEqual(["soon", "later", "none"]);
  });
});

describe("browse ordering", () => {
  it("orders by computed distance, then unpinned and remote tasks", () => {
    const near = task({ id: "near" });
    const five = task({ id: "five", latitude: 14.645, longitude: 120.9842 });
    const unpinned = task({ id: "unpinned", latitude: null, longitude: null });

    expect(
      ids(browsePublicTasks([five, unpinned, near], filters({ sort: "nearest" }), area())),
    ).toEqual(["near", "five", "unpinned"]);
  });

  it("orders by budget and by deadline", () => {
    const cheap = task({ id: "cheap", budget: 300, deadline: "2026-11-10T17:00:00+08:00" });
    const pricey = task({ id: "pricey", budget: 1200, deadline: "2026-10-27T17:00:00+08:00" });

    expect(ids(browsePublicTasks([pricey, cheap], filters({ sort: "budget_asc" }), anywhere))).toEqual(["cheap", "pricey"]);
    expect(ids(browsePublicTasks([pricey, cheap], filters({ sort: "deadline" }), anywhere))).toEqual(["pricey", "cheap"]);
  });

  it("keeps the source order for recommended results", () => {
    const first = task({ id: "first" });
    const second = task({ id: "second" });

    expect(ids(browsePublicTasks([first, second], filters(), anywhere))).toEqual(["first", "second"]);
  });
});

describe("distance labels", () => {
  it("shows whole kilometres and keeps sub-kilometre distances vague", () => {
    expect(formatBrowseDistance(null)).toBeNull();
    expect(formatBrowseDistance(0.4)).toBe("<1 km");
    expect(formatBrowseDistance(1.3)).toBe("1 km");
    expect(formatBrowseDistance(4.6)).toBe("5 km");
  });
});

describe("sample demo data", () => {
  it("gives every open local task coordinates so radius search works", () => {
    const local = sampleTasks.filter(
      (task) => task.status === "open" && task.fulfillmentMode === "local",
    );

    expect(local.length).toBeGreaterThan(0);
    for (const task of local) {
      expect(typeof task.latitude).toBe("number");
      expect(typeof task.longitude).toBe("number");
    }
  });

  it("never returns coordinates or the exact address in a public card", () => {
    const [result] = browsePublicTasks(
      [task({ addressLine: "1234 Rizal Street", latitude: 14.62, longitude: 121 })],
      filters(),
      anywhere,
    ).tasks;

    expect(result.task).not.toHaveProperty("addressLine");
    expect(result.task).not.toHaveProperty("latitude");
    expect(result.task).not.toHaveProperty("longitude");
  });
});
