import { describe, expect, it } from "vitest";
import {
  applySearchArea,
  paginate,
  sortPublicTasks,
  toPublicTaskDetail,
  toPublicTaskSummary,
  type DiscoverableTask,
} from "./discovery";
import { matchesPublicFilters, parsePublicTaskQuery } from "./discovery-query";
import { canViewExactAddress, type PaymentState } from "./address-access";
import type { SearchArea } from "./location";

const manila = { latitude: 14.5995, longitude: 120.9842 };
const nearby = { latitude: 14.62, longitude: 121.0 };
const far = { latitude: 14.9, longitude: 121.4 };

function task(overrides: Partial<DiscoverableTask> = {}): DiscoverableTask {
  return {
    id: "task_1",
    posterId: "poster_1",
    posterName: "Maria Santos",
    title: "Pick up groceries",
    description: "Buy groceries and deliver them nearby.",
    category: "Delivery",
    budgetCents: 45000,
    currency: "PHP",
    deadline: new Date("2026-11-01T17:00:00.000Z"),
    publishedAt: new Date("2026-10-25T12:00:00.000Z"),
    status: "open",
    fulfillmentMode: "local",
    hiringMode: "bidding",
    areaLabel: "Sampaloc, Manila",
    exactAddress: "1234 Rizal Street, Sampaloc, Manila",
    latitude: nearby.latitude,
    longitude: nearby.longitude,
    ...overrides,
  };
}

function area(overrides: Partial<SearchArea> = {}): SearchArea {
  return {
    origin: manila,
    radiusKm: 10,
    source: "chosen",
    label: null,
    ...overrides,
  };
}

describe("public task query parsing", () => {
  it("defaults to nationwide, recommended order, first page", () => {
    const parsed = parsePublicTaskQuery(new URLSearchParams());

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.query).toMatchObject({
      origin: null,
      radiusKm: null,
      sort: "recommended",
      page: 1,
      pageSize: 20,
      filters: {
        search: null,
        category: null,
        fulfillmentMode: null,
        hiringMode: null,
        budgetMinCents: null,
        budgetMaxCents: null,
        deadlineBefore: null,
      },
    });
  });

  it("reads a chosen origin, radius, and every filter", () => {
    const parsed = parsePublicTaskQuery(
      new URLSearchParams({
        q: "  groceries ",
        category: "delivery",
        fulfillment: "local",
        hiring: "bidding",
        budgetMinCents: "10000",
        budgetMaxCents: "50000",
        deadlineBefore: "2026-11-01",
        lat: "14.6",
        lng: "121",
        radiusKm: "5",
        sort: "nearest",
        page: "2",
        pageSize: "10",
      }),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.query.filters).toEqual({
      search: "groceries",
      category: "Delivery",
      fulfillmentMode: "local",
      hiringMode: "bidding",
      budgetMinCents: 10000,
      budgetMaxCents: 50000,
      deadlineBefore: new Date("2026-11-01T00:00:00.000Z"),
    });
    expect(parsed.query.origin).toEqual({ latitude: 14.6, longitude: 121 });
    expect(parsed.query.radiusKm).toBe(5);
    expect(parsed.query.sort).toBe("nearest");
    expect(parsed.query.page).toBe(2);
    expect(parsed.query.pageSize).toBe(10);
  });

  it("rejects an origin that is missing half a coordinate pair", () => {
    const parsed = parsePublicTaskQuery(new URLSearchParams({ lat: "14.6" }));

    expect(parsed).toMatchObject({ ok: false });
    if (parsed.ok) return;
    expect(parsed.issues).toHaveProperty("origin");
  });

  it("rejects high-risk and unknown category filters", () => {
    const excluded = parsePublicTaskQuery(new URLSearchParams({ category: "childcare" }));
    const unknown = parsePublicTaskQuery(new URLSearchParams({ category: "astrology" }));

    expect(excluded).toMatchObject({ ok: false });
    expect(unknown).toMatchObject({ ok: false });
    if (excluded.ok || unknown.ok) return;
    expect(excluded.issues.category).toMatch(/high-risk/i);
    expect(unknown.issues.category).toMatch(/launch-approved/i);
  });

  it("rejects an inverted budget range, an unknown sort, and a bad page", () => {
    expect(
      parsePublicTaskQuery(
        new URLSearchParams({ budgetMinCents: "500", budgetMaxCents: "100" }),
      ),
    ).toMatchObject({ ok: false });
    expect(
      parsePublicTaskQuery(new URLSearchParams({ budgetMinCents: "-1" })),
    ).toMatchObject({ ok: false });
    expect(parsePublicTaskQuery(new URLSearchParams({ radiusKm: "500" }))).toMatchObject({
      ok: false,
    });
    expect(parsePublicTaskQuery(new URLSearchParams({ sort: "popular" }))).toMatchObject({
      ok: false,
    });
    expect(parsePublicTaskQuery(new URLSearchParams({ page: "0" }))).toMatchObject({
      ok: false,
    });
  });
});

describe("public task filters", () => {
  const filters = {
    search: null,
    category: null,
    fulfillmentMode: null,
    hiringMode: null,
    budgetMinCents: null,
    budgetMaxCents: null,
    deadlineBefore: null,
  };

  it("searches title, description, category, and public area", () => {
    for (const search of ["groceries", "deliver", "delivery", "sampaloc"]) {
      expect(matchesPublicFilters(task(), { ...filters, search })).toBe(true);
    }
    expect(matchesPublicFilters(task(), { ...filters, search: "plumbing" })).toBe(false);
  });

  it("matches category, mode, budget, and deadline together", () => {
    expect(matchesPublicFilters(task(), { ...filters, category: "delivery" })).toBe(true);
    expect(matchesPublicFilters(task(), { ...filters, category: "cleaning" })).toBe(false);
    expect(
      matchesPublicFilters(task(), { ...filters, fulfillmentMode: "remote" }),
    ).toBe(false);
    expect(
      matchesPublicFilters(task(), { ...filters, budgetMinCents: 50000 }),
    ).toBe(false);
    expect(
      matchesPublicFilters(task(), {
        ...filters,
        deadlineBefore: new Date("2026-10-30T00:00:00.000Z"),
      }),
    ).toBe(false);
  });
});

describe("public task area filtering", () => {
  it("keeps local tasks inside the radius and remote tasks without a location", () => {
    const inside = task({ id: "inside" });
    const outside = task({ id: "outside", latitude: far.latitude, longitude: far.longitude });
    const remote = task({
      id: "remote",
      fulfillmentMode: "remote",
      areaLabel: null,
      exactAddress: null,
      latitude: null,
      longitude: null,
    });

    const ranked = applySearchArea([inside, outside, remote], area());

    expect(ranked.map((item) => item.task.id)).toEqual(["inside", "remote"]);
    expect(ranked[0].distanceKm).toBeGreaterThan(0);
    expect(ranked[1].distanceKm).toBeNull();
  });

  it("keeps local tasks without coordinates but leaves them unranked", () => {
    const ranked = applySearchArea([task({ latitude: null, longitude: null })], area());

    expect(ranked).toHaveLength(1);
    expect(ranked[0].distanceKm).toBeNull();
  });

  it("keeps every task when browsing nationwide", () => {
    const nationwide = area({ origin: null, source: "nationwide" });

    expect(
      applySearchArea([task(), task({ id: "remote", fulfillmentMode: "remote" })], nationwide),
    ).toHaveLength(2);
  });
});

describe("public task ordering and paging", () => {
  const items = [
    { task: task({ id: "a", budgetCents: 300, latitude: far.latitude, longitude: far.longitude }), distanceKm: 40 },
    { task: task({ id: "b", budgetCents: 100 }), distanceKm: 2 },
    { task: task({ id: "c", budgetCents: 200 }), distanceKm: null },
  ];

  it("orders by distance with remote tasks last", () => {
    expect(sortPublicTasks(items, "nearest").map((item) => item.task.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("orders by budget in both directions", () => {
    expect(sortPublicTasks(items, "budget_asc").map((item) => item.task.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
    expect(sortPublicTasks(items, "budget_desc").map((item) => item.task.id)).toEqual([
      "a",
      "c",
      "b",
    ]);
  });

  it("reports totals while slicing the requested page", () => {
    expect(paginate(items, 2, 2)).toEqual({
      items: [items[2]],
      total: 3,
      page: 2,
      pageSize: 2,
      totalPages: 2,
    });
  });
});

describe("public task projection", () => {
  it("never exposes the exact address or coordinates while browsing", () => {
    const summary = toPublicTaskSummary(task(), 1.3);

    expect(summary).toMatchObject({
      id: "task_1",
      areaLabel: "Sampaloc, Manila",
      distanceKm: 1,
      posterName: "Maria Santos",
    });
    expect(summary).not.toHaveProperty("exactAddress");
    expect(summary).not.toHaveProperty("latitude");
    expect(summary).not.toHaveProperty("longitude");
    expect(JSON.stringify(summary)).not.toContain("Rizal Street");
  });

  it("marks remote tasks without an area or distance", () => {
    const summary = toPublicTaskSummary(
      task({ fulfillmentMode: "remote", areaLabel: null, exactAddress: null }),
      null,
    );

    expect(summary).toMatchObject({ areaLabel: null, distanceKm: null });
  });
});

describe("exact address access", () => {
  const base = {
    posterId: "poster_1",
    viewerId: "tasker_1",
    assignmentTaskerId: "tasker_1",
    taskStatus: "assigned" as const,
    paymentStatuses: ["paid_pending_completion"] as PaymentState[],
    hasAddress: true,
  };

  it("reveals the address to the assigned Tasker after payment", () => {
    expect(canViewExactAddress(base)).toBe(true);
    expect(canViewExactAddress({ ...base, taskStatus: "in_progress" })).toBe(true);
  });

  it("hides the address before assignment activation or before payment", () => {
    for (const taskStatus of ["open", "pending_payment", "cancelled"] as const) {
      expect(canViewExactAddress({ ...base, taskStatus })).toBe(false);
    }
    for (const paymentStatuses of [[], ["unpaid"], ["checkout_started"], ["refunded"]] as PaymentState[][]) {
      expect(canViewExactAddress({ ...base, paymentStatuses })).toBe(false);
    }
  });

  it("hides the address from guests, other Taskers, applicants, and unassigned users", () => {
    expect(canViewExactAddress({ ...base, viewerId: null })).toBe(false);
    expect(canViewExactAddress({ ...base, viewerId: "tasker_2" })).toBe(false);
    expect(canViewExactAddress({ ...base, assignmentTaskerId: "tasker_2" })).toBe(false);
    expect(canViewExactAddress({ ...base, assignmentTaskerId: null })).toBe(false);
  });

  it("lets the Poster read their own task address", () => {
    expect(canViewExactAddress({ ...base, viewerId: "poster_1", taskStatus: "open" })).toBe(true);
  });

  it("returns no address when the task has none", () => {
    expect(canViewExactAddress({ ...base, hasAddress: false })).toBe(false);
  });

  it("projects the detail with the address only when access is allowed", () => {
    const revealed = toPublicTaskDetail(task(), { ...base });
    const hidden = toPublicTaskDetail(task(), { ...base, viewerId: "tasker_2" });

    expect(revealed).toMatchObject({
      exactAddress: "1234 Rizal Street, Sampaloc, Manila",
      addressVisible: true,
    });
    expect(hidden.exactAddress).toBeNull();
    expect(hidden.addressVisible).toBe(false);
    expect(hidden).not.toHaveProperty("latitude");
  });
});
