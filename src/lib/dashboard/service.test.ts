import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, ownedTasksMock, taskerApplicationsMock, chatsMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findUnique: vi.fn() },
    bid: { findMany: vi.fn() },
    taskRequest: { findMany: vi.fn() },
    assignment: { findMany: vi.fn() },
  },
  ownedTasksMock: vi.fn(),
  taskerApplicationsMock: vi.fn(),
  chatsMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/tasks/owner-service", () => ({ listOwnedTasks: ownedTasksMock }));
vi.mock("@/lib/applications/service", () => ({ listApplicationsForTasker: taskerApplicationsMock }));
vi.mock("@/lib/chat/service", () => ({ listChats: chatsMock }));

import { getDashboardData } from "./service";

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findUnique.mockResolvedValue({ name: "Poster One" });
  prismaMock.bid.findMany.mockResolvedValue([]);
  prismaMock.taskRequest.findMany.mockResolvedValue([]);
  prismaMock.assignment.findMany.mockResolvedValue([]);
  ownedTasksMock.mockResolvedValue([]);
  taskerApplicationsMock.mockResolvedValue([]);
  chatsMock.mockResolvedValue([]);
});

describe("persistent dashboard service", () => {
  it("scopes posted tasks and review rows to the authenticated Poster", async () => {
    ownedTasksMock.mockResolvedValue([{
      id: "task-owned",
      title: "Pick up groceries",
      status: "open",
      category: "Delivery",
      budget: 450,
      applications: 1,
      poster: "Poster One",
      description: "",
      fulfillmentMode: "local",
      hiringMode: "bidding",
      location: "Manila",
      deadline: "",
    }]);
    prismaMock.bid.findMany.mockResolvedValue([{
      id: "bid-from-tasker",
      taskId: "task-owned",
      taskerId: "tasker-2",
      amountCents: 40000,
      createdAt: new Date("2026-11-17T05:00:00.000Z"),
      tasker: { name: "Tasker Two", taskerVerification: { status: "VERIFIED" } },
      task: { title: "Pick up groceries" },
    }]);

    const result = await getDashboardData("poster-1");

    expect(ownedTasksMock).toHaveBeenCalledWith("poster-1");
    expect(prismaMock.bid.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { taskId: { in: ["task-owned"] }, status: "SUBMITTED" },
    }));
    expect(result.postedTasks).toMatchObject([{ id: "task-owned", awaitingReview: 1 }]);
    expect(result.awaitingReview).toMatchObject([{ tasker: "Tasker Two", amountCents: 40000, taskId: "task-owned" }]);
    expect(result.summary).toMatchObject({ openTasks: 1, awaitingReview: 1 });
  });
});
