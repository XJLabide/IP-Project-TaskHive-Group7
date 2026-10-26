import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    task: { findMany: vi.fn(), findFirst: vi.fn() },
    profile: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { getPublicTaskDetail, listPublicTasks } from "./discovery-service";
import { parsePublicTaskQuery } from "./discovery-query";

const manila = { latitude: 14.5995, longitude: 120.9842 };

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "task_1",
    posterId: "poster_1",
    title: "Pick up groceries",
    description: "Buy groceries and deliver them nearby.",
    budgetCents: 45000,
    currency: "PHP",
    deadline: new Date("2026-11-01T17:00:00.000Z"),
    publishedAt: new Date("2026-10-25T12:00:00.000Z"),
    locationLabel: "Sampaloc, Manila",
    addressLine: "1234 Rizal Street, Sampaloc, Manila",
    latitude: 14.62,
    longitude: 121.0,
    fulfillmentMode: "LOCAL",
    hiringMode: "BIDDING",
    status: "OPEN",
    category: { name: "Delivery" },
    poster: { name: "Maria Santos" },
    assignment: null,
    payments: [],
    ...overrides,
  };
}

function query(search = "") {
  const parsed = parsePublicTaskQuery(new URLSearchParams(search));
  if (!parsed.ok) throw new Error("fixture query did not parse");
  return parsed.query;
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.profile.findUnique.mockResolvedValue(null);
  prismaMock.task.findMany.mockResolvedValue([]);
});

describe("public task discovery", () => {
  it("queries only open tasks and pushes filters into the database", async () => {
    await listPublicTasks(
      query(
        "q=groceries&category=delivery&fulfillment=local&hiring=bidding&budgetMinCents=10000&budgetMaxCents=50000&deadlineBefore=2026-11-01",
      ),
      null,
    );

    expect(prismaMock.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "OPEN",
          fulfillmentMode: "LOCAL",
          hiringMode: "BIDDING",
          budgetCents: { gte: 10000, lte: 50000 },
          deadline: { lte: new Date("2026-11-01T00:00:00.000Z") },
          category: { is: { name: "Delivery" } },
          OR: expect.arrayContaining([
            { title: { contains: "groceries", mode: "insensitive" } },
          ]),
        }),
      }),
    );
    expect(prismaMock.profile.findUnique).not.toHaveBeenCalled();
  });

  it("defaults to 10 km around the saved location for a signed-in Tasker", async () => {
    prismaMock.profile.findUnique.mockResolvedValue({
      latitude: manila.latitude,
      longitude: manila.longitude,
      locationLabel: "Manila",
    });
    prismaMock.task.findMany.mockResolvedValue([
      row({ id: "inside", latitude: 14.62, longitude: 121.0 }),
      row({ id: "outside", latitude: 14.9, longitude: 121.4 }),
      row({ id: "remote", fulfillmentMode: "REMOTE", latitude: null, longitude: null, locationLabel: null }),
    ]);

    const result = await listPublicTasks(query(), "tasker_1");

    expect(prismaMock.profile.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "tasker_1" } }),
    );
    expect(result.searchArea).toEqual({
      origin: manila,
      radiusKm: 10,
      source: "saved",
      label: "Manila",
    });
    expect(result.tasks.map((task) => task.id)).toEqual(["inside", "remote"]);
    expect(result.pagination).toMatchObject({ total: 2, page: 1, pageSize: 20 });
  });

  it("browses nationwide for guests and never leaks the exact address", async () => {
    prismaMock.task.findMany.mockResolvedValue([row()]);

    const result = await listPublicTasks(query(), null);

    expect(result.searchArea.source).toBe("nationwide");
    expect(result.tasks[0]).not.toHaveProperty("exactAddress");
    expect(JSON.stringify(result.tasks)).not.toContain("Rizal Street");
    expect(prismaMock.profile.findUnique).not.toHaveBeenCalled();
  });

  it("honours a chosen origin over the saved location", async () => {
    prismaMock.task.findMany.mockResolvedValue([row({ id: "town", latitude: 14.66, longitude: 121.0 })]);

    const result = await listPublicTasks(query("lat=14.65&lng=121&radiusKm=5"), "tasker_1");

    expect(prismaMock.profile.findUnique).not.toHaveBeenCalled();
    expect(result.searchArea).toMatchObject({ source: "chosen", radiusKm: 5 });
    expect(result.tasks).toHaveLength(1);
  });
});

describe("public task detail", () => {
  it("reveals the exact address to the assigned Tasker after payment", async () => {
    prismaMock.task.findFirst.mockResolvedValue(
      row({
        status: "ASSIGNED",
        assignment: { taskerId: "tasker_1" },
        payments: [{ status: "PAID_PENDING_COMPLETION" }],
      }),
    );

    const detail = await getPublicTaskDetail("task_1", "tasker_1");

    expect(detail).toMatchObject({
      id: "task_1",
      addressVisible: true,
      exactAddress: "1234 Rizal Street, Sampaloc, Manila",
    });
  });

  it("hides the address from guests and from the Tasker before payment", async () => {
    prismaMock.task.findFirst.mockResolvedValue(
      row({ status: "ASSIGNED", assignment: { taskerId: "tasker_1" }, payments: [] }),
    );

    const asGuest = await getPublicTaskDetail("task_1", null);
    const asTasker = await getPublicTaskDetail("task_1", "tasker_1");

    expect(asGuest).toBeNull();
    expect(asTasker).toMatchObject({ addressVisible: false, exactAddress: null });
  });

  it("hides unfinished work from guests and strangers", async () => {
    prismaMock.task.findFirst.mockResolvedValue(row({ status: "ASSIGNED", assignment: { taskerId: "tasker_1" } }));

    expect(await getPublicTaskDetail("task_1", null)).toBeNull();
    expect(await getPublicTaskDetail("task_1", "tasker_2")).toBeNull();
    expect(prismaMock.task.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "task_1" } }),
    );
  });

  it("lets the Poster read their own draft", async () => {
    prismaMock.task.findFirst.mockResolvedValue(row({ status: "DRAFT", publishedAt: null }));

    const detail = await getPublicTaskDetail("task_1", "poster_1");

    expect(detail).toMatchObject({ id: "task_1", exactAddress: "1234 Rizal Street, Sampaloc, Manila" });
  });

  it("returns null when the task does not exist", async () => {
    prismaMock.task.findFirst.mockResolvedValue(null);

    expect(await getPublicTaskDetail("task_missing", "tasker_1")).toBeNull();
  });
});
