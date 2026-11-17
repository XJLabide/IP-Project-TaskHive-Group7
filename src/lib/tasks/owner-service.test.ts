import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyMock } = vi.hoisted(() => ({ findManyMock: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { task: { findMany: findManyMock } } }));

import { listOwnedTasks } from "./owner-service";

beforeEach(() => {
  vi.clearAllMocks();
  findManyMock.mockResolvedValue([{
    id: "task-1",
    posterId: "poster-1",
    title: "Pick up groceries",
    description: "Buy groceries and bring them home.",
    budgetCents: 45000,
    deadline: new Date("2026-11-30T12:00:00.000Z"),
    locationLabel: "Sampaloc",
    addressLine: "Private address",
    latitude: 14.6,
    longitude: 121,
    fulfillmentMode: "LOCAL",
    hiringMode: "BIDDING",
    status: "DRAFT",
    category: { name: "Delivery" },
    poster: { name: "Poster One" },
    _count: { bids: 1, taskRequests: 0 },
  }]);
});

describe("listOwnedTasks", () => {
  it("returns the account’s drafts and authoring fields from persistent storage", async () => {
    const tasks = await listOwnedTasks("poster-1");

    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({
      where: { posterId: "poster-1" },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    }));
    expect(tasks[0]).toMatchObject({
      id: "task-1",
      status: "draft",
      budget: 450,
      addressLine: "Private address",
      applications: 1,
      poster: "Poster One",
    });
  });
});
