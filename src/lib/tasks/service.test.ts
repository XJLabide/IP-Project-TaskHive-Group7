import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, txMock, notifyUserMock, queueNotificationEmailMock } = vi.hoisted(() => {
  const txMock = {
    task: { updateMany: vi.fn() },
    bid: { findMany: vi.fn(), updateMany: vi.fn() },
    taskRequest: { findMany: vi.fn(), updateMany: vi.fn() },
    notification: { createManyAndReturn: vi.fn() },
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

  return {
    prismaMock,
    txMock,
    notifyUserMock: vi.fn(),
    queueNotificationEmailMock: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/notifications", () => ({
  notifyUser: notifyUserMock,
  queueNotificationEmail: queueNotificationEmailMock,
  buildNotificationCreateData: (input: {
    userId: string;
    type: string;
    title: string;
    body?: string;
    eventKey: string;
    href?: string;
  }) => ({
    ...input,
    eventKey: `hashed:${input.eventKey}`,
    href: input.href ?? "/my-work",
    emailStatus: "PENDING",
  }),
}));

import { createTask, deleteTask, updateTask } from "./service";
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
  txMock.notification.createManyAndReturn.mockResolvedValue([{ id: "notification_1" }]);
  prismaMock.task.deleteMany.mockResolvedValue({ count: 1 });
});

describe("task authoring service", () => {
  it("stores the exact address privately when a local task is created", async () => {
    prismaMock.task.create.mockResolvedValue({ id: "task_1", status: "OPEN" });

    const result = await createTask(
      "poster_1",
      {
        title: "Pick up groceries",
        description: "Buy groceries and deliver them nearby.",
        category: "Delivery",
        budgetCents: 45000,
        deadline: new Date("2026-11-01T17:00:00.000Z"),
        fulfillmentMode: "local",
        hiringMode: "bidding",
        locationLabel: "Sampaloc, Manila",
        addressLine: "1234 Rizal Street, Sampaloc, Manila",
        latitude: 14.6,
        longitude: 121.0,
      },
      true,
    );

    expect(result).toMatchObject({ ok: true, status: "open" });
    expect(prismaMock.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          locationLabel: "Sampaloc, Manila",
          addressLine: "1234 Rizal Street, Sampaloc, Manila",
          latitude: 14.6,
          longitude: 121,
        }),
      }),
    );
  });

  it("drops the exact address when a task becomes remote", async () => {
    prismaMock.task.create.mockResolvedValue({ id: "task_2", status: "OPEN" });

    await createTask(
      "poster_1",
      {
        title: "Edit a product description",
        description: "Rewrite the product description for clarity.",
        category: "Writing",
        budgetCents: 45000,
        deadline: new Date("2026-11-01T17:00:00.000Z"),
        fulfillmentMode: "remote",
        hiringMode: "fixed_price",
        locationLabel: "Sampaloc, Manila",
        addressLine: "1234 Rizal Street, Sampaloc, Manila",
      },
      true,
    );

    expect(prismaMock.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ locationLabel: null, addressLine: null }),
      }),
    );
  });

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
    expect(txMock.notification.createManyAndReturn).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          eventKey: expect.stringContaining("hashed:task.material-edit:task_1:"),
          userId: "tasker_1",
          type: "task.material_edit",
          emailStatus: "PENDING",
        }),
      ],
      select: { id: true },
    });
    expect(queueNotificationEmailMock).toHaveBeenCalledWith(
      "notification_1",
    );
  });

  it("does not withdraw applications for a non-material edit", async () => {
    await updateTask("task_1", "poster_1", { category: "Errands" });

    expect(txMock.bid.updateMany).not.toHaveBeenCalled();
    expect(txMock.notification.createManyAndReturn).not.toHaveBeenCalled();
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
