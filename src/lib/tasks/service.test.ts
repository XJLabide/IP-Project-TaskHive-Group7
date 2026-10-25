import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, txMock, publishJobMock } = vi.hoisted(() => {
  const txMock = {
    task: { updateMany: vi.fn() },
    bid: { findMany: vi.fn(), updateMany: vi.fn() },
    taskRequest: { findMany: vi.fn(), updateMany: vi.fn() },
    notification: { createMany: vi.fn() },
  };

  const prismaMock = {
    task: {
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    category: { upsert: vi.fn() },
    $transaction: vi.fn(),
  };

  return { prismaMock, txMock, publishJobMock: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/queue/qstash", () => ({ publishJob: publishJobMock }));

import { deleteTask, updateTask } from "./service";

const openTask = {
  id: "task_1",
  posterId: "poster_1",
  categoryId: "category_1",
  title: "Pick up groceries",
  description: "Buy groceries and deliver them nearby.",
  budgetCents: 45000,
  currency: "PHP",
  deadline: new Date("2026-11-01T17:00:00.000Z"),
  locationLabel: "Community Market",
  latitude: null,
  longitude: null,
  fulfillmentMode: "LOCAL",
  hiringMode: "BIDDING",
  status: "OPEN",
  publishedAt: new Date("2026-10-25T12:00:00.000Z"),
  cancelledAt: null,
  createdAt: new Date("2026-10-25T12:00:00.000Z"),
  updatedAt: new Date("2026-10-25T12:00:00.000Z"),
  category: { name: "Delivery" },
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(
    async (callback: (tx: typeof txMock) => unknown) => callback(txMock),
  );
  prismaMock.category.upsert.mockResolvedValue({ id: "category_1" });
  prismaMock.task.findUnique.mockResolvedValue(openTask);
  txMock.task.updateMany.mockResolvedValue({ count: 1 });
  txMock.bid.findMany.mockResolvedValue([]);
  txMock.taskRequest.findMany.mockResolvedValue([]);
  prismaMock.task.deleteMany.mockResolvedValue({ count: 1 });
});

describe("task authoring service", () => {
  it("withdraws applications and writes in-app notifications after a material edit", async () => {
    txMock.bid.findMany.mockResolvedValue([{ id: "bid_1", taskerId: "tasker_1" }]);

    const result = await updateTask("task_1", "poster_1", { budgetCents: 50000 });

    expect(result).toMatchObject({ ok: true, clearedApplications: 1 });
    expect(prismaMock.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
    expect(txMock.bid.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "INVALIDATED" } }),
    );
    expect(txMock.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: "tasker_1",
          type: "task.material_edit",
        }),
      ],
    });
    expect(publishJobMock).toHaveBeenCalledWith(
      "notify.task.material_edit",
      expect.anything(),
    );
  });

  it("does not withdraw applications for a non-material edit", async () => {
    await updateTask("task_1", "poster_1", { category: "Errands" });

    expect(txMock.bid.updateMany).not.toHaveBeenCalled();
    expect(txMock.notification.createMany).not.toHaveBeenCalled();
  });

  it("refuses to delete a published task", async () => {
    const result = await deleteTask("task_1", "poster_1");

    expect(result).toMatchObject({
      ok: false,
      code: "published_task_must_be_cancelled",
    });
    expect(prismaMock.task.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes a draft through a status-guarded delete", async () => {
    prismaMock.task.findUnique.mockResolvedValue({ ...openTask, status: "DRAFT" });

    const result = await deleteTask("task_1", "poster_1");

    expect(result).toMatchObject({ ok: true, status: null });
    expect(prismaMock.task.deleteMany).toHaveBeenCalledWith({
      where: { id: "task_1", posterId: "poster_1", status: "DRAFT" },
    });
  });

  it("refuses a change from a different account", async () => {
    const result = await updateTask("task_1", "someone_else", { budgetCents: 50000 });

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("reports a stale edit instead of overwriting a status change", async () => {
    txMock.task.updateMany.mockResolvedValue({ count: 0 });

    const result = await updateTask("task_1", "poster_1", { budgetCents: 50000 });

    expect(result).toMatchObject({ ok: false, code: "invalid_transition" });
  });
});
