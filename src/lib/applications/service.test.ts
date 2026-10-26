import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, publishJobMock } = vi.hoisted(() => ({
  prismaMock: {
    task: { findUnique: vi.fn() },
    bid: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    taskRequest: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    notification: { create: vi.fn() },
  },
  publishJobMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/queue/qstash", () => ({ publishJob: publishJobMock }));

import {
  createBid,
  createRequest,
  listApplicationsForTask,
  listApplicationsForTasker,
  withdrawApplication,
} from "./service";

const pendingActor = { id: "tasker_1", verification: "pending" as const };

const openBiddingTask = {
  id: "task_1",
  posterId: "poster_1",
  title: "Pick up groceries",
  status: "OPEN",
  hiringMode: "BIDDING",
};

const openFixedTask = {
  ...openBiddingTask,
  id: "task_fixed",
  hiringMode: "FIXED_PRICE",
};

const bidRow = {
  id: "bid_1",
  taskId: "task_1",
  taskerId: "tasker_1",
  amountCents: 45000,
  message: "I can deliver before 5 PM.",
  estimatedTime: "1 hour",
  status: "SUBMITTED",
  createdAt: new Date("2026-10-26T08:00:00.000Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.task.findUnique.mockResolvedValue(openBiddingTask);
  prismaMock.bid.findUnique.mockResolvedValue(null);
  prismaMock.bid.create.mockResolvedValue(bidRow);
  prismaMock.bid.updateMany.mockResolvedValue({ count: 0 });
  prismaMock.bid.findMany.mockResolvedValue([]);
  prismaMock.taskRequest.findUnique.mockResolvedValue(null);
  prismaMock.taskRequest.create.mockResolvedValue({
    ...bidRow,
    id: "request_1",
    amountCents: null,
    message: "Available tomorrow.",
  });
  prismaMock.taskRequest.updateMany.mockResolvedValue({ count: 0 });
  prismaMock.taskRequest.findMany.mockResolvedValue([]);
  prismaMock.notification.create.mockResolvedValue({});
});

describe("creating applications", () => {
  it("creates a bid and notifies the Poster", async () => {
    const result = await createBid(pendingActor, "task_1", {
      amountCents: 45000,
      message: "I can deliver before 5 PM.",
      estimatedTime: "1 hour",
    });

    expect(result).toMatchObject({
      ok: true,
      application: {
        id: "bid_1",
        kind: "bid",
        status: "submitted",
        verification: "pending",
      },
    });
    expect(prismaMock.bid.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          taskId: "task_1",
          taskerId: "tasker_1",
          amountCents: 45000,
          status: "SUBMITTED",
        }),
      }),
    );
    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "poster_1", type: "application.bid" }),
      }),
    );
    expect(publishJobMock).toHaveBeenCalledWith("notify.bid.created", expect.anything());
  });

  it("creates a fixed-price request", async () => {
    prismaMock.task.findUnique.mockResolvedValue(openFixedTask);

    const result = await createRequest(pendingActor, "task_fixed", {
      message: "Available tomorrow.",
    });

    expect(result).toMatchObject({ ok: true, application: { kind: "request" } });
    expect(prismaMock.taskRequest.create).toHaveBeenCalled();
    expect(prismaMock.bid.create).not.toHaveBeenCalled();
  });

  it("rejects the wrong application type for the hiring mode", async () => {
    prismaMock.task.findUnique.mockResolvedValue(openFixedTask);

    const result = await createBid(pendingActor, "task_fixed", {
      amountCents: 45000,
      message: "I can deliver before 5 PM.",
    });

    expect(result).toMatchObject({ ok: false, code: "wrong_hiring_mode" });
    expect(prismaMock.bid.create).not.toHaveBeenCalled();
  });

  it("refuses a duplicate live application", async () => {
    prismaMock.bid.findUnique.mockResolvedValue({ status: "SUBMITTED" });

    const result = await createBid(pendingActor, "task_1", {
      amountCents: 45000,
      message: "I can deliver before 5 PM.",
    });

    expect(result).toMatchObject({ ok: false, code: "duplicate_application" });
    expect(prismaMock.bid.create).not.toHaveBeenCalled();
  });

  it("reactivates a withdrawn application instead of duplicating it", async () => {
    prismaMock.bid.findUnique.mockResolvedValue({ id: "bid_1", status: "WITHDRAWN" });
    prismaMock.bid.updateMany.mockResolvedValue({ count: 1 });

    const result = await createBid(pendingActor, "task_1", {
      amountCents: 50000,
      message: "Still available.",
    });

    expect(result).toMatchObject({ ok: true });
    expect(prismaMock.bid.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ taskId: "task_1", taskerId: "tasker_1" }),
        data: expect.objectContaining({ status: "SUBMITTED", amountCents: 50000 }),
      }),
    );
    expect(prismaMock.bid.create).not.toHaveBeenCalled();
  });

  it("refuses own tasks, closed tasks, and rejected Taskers", async () => {
    const own = await createBid({ ...pendingActor, id: "poster_1" }, "task_1", {
      amountCents: 45000,
      message: "I can deliver before 5 PM.",
    });
    expect(own).toMatchObject({ ok: false, code: "own_task" });

    prismaMock.task.findUnique.mockResolvedValue({ ...openBiddingTask, status: "DRAFT" });
    const closed = await createBid(pendingActor, "task_1", {
      amountCents: 45000,
      message: "I can deliver before 5 PM.",
    });
    expect(closed).toMatchObject({ ok: false, code: "task_not_open" });

    prismaMock.task.findUnique.mockResolvedValue(openBiddingTask);
    const rejected = await createBid({ ...pendingActor, verification: "rejected" }, "task_1", {
      amountCents: 45000,
      message: "I can deliver before 5 PM.",
    });
    expect(rejected).toMatchObject({ ok: false, code: "verification_rejected" });
  });
});

describe("withdrawing applications", () => {
  const bidWithTask = { ...bidRow, task: openBiddingTask };

  it("withdraws a submitted bid and notifies the Poster", async () => {
    prismaMock.bid.findUnique.mockResolvedValue(bidWithTask);
    prismaMock.bid.updateMany.mockResolvedValue({ count: 1 });

    const result = await withdrawApplication("tasker_1", "bid_1");

    expect(result).toMatchObject({ ok: true, status: "withdrawn" });
    expect(prismaMock.bid.updateMany).toHaveBeenCalledWith({
      where: { id: "bid_1", taskerId: "tasker_1", status: "SUBMITTED" },
      data: { status: "WITHDRAWN" },
    });
    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "application.withdrawn" }),
      }),
    );
  });

  it("refuses another Tasker's application", async () => {
    prismaMock.bid.findUnique.mockResolvedValue(bidWithTask);

    const result = await withdrawApplication("tasker_2", "bid_1");

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
    expect(prismaMock.bid.updateMany).not.toHaveBeenCalled();
  });

  it("locks withdrawal once a Tasker is assigned", async () => {
    prismaMock.bid.findUnique.mockResolvedValue({
      ...bidWithTask,
      task: { ...openBiddingTask, status: "ASSIGNED" },
    });

    const result = await withdrawApplication("tasker_1", "bid_1");

    expect(result).toMatchObject({ ok: false, code: "applications_locked" });
    expect(prismaMock.bid.updateMany).not.toHaveBeenCalled();
  });

  it("reports a raced withdrawal instead of overwriting another status", async () => {
    prismaMock.bid.findUnique.mockResolvedValue(bidWithTask);
    prismaMock.bid.updateMany.mockResolvedValue({ count: 0 });

    const result = await withdrawApplication("tasker_1", "bid_1");

    expect(result).toMatchObject({ ok: false, code: "application_not_submitted" });
  });

  it("withdraws a fixed-price request", async () => {
    const request = { ...bidRow, id: "request_1", task: openFixedTask };
    prismaMock.bid.findUnique.mockResolvedValue(null);
    prismaMock.taskRequest.findUnique.mockResolvedValue(request);
    prismaMock.taskRequest.updateMany.mockResolvedValue({ count: 1 });

    const result = await withdrawApplication("tasker_1", "request_1");

    expect(result).toMatchObject({ ok: true, status: "withdrawn" });
    expect(prismaMock.taskRequest.updateMany).toHaveBeenCalled();
  });
});

describe("listing applications for a Poster", () => {
  it("returns every applicant with pending verification marked unapprovable", async () => {
    prismaMock.bid.findMany.mockResolvedValue([
      {
        ...bidRow,
        task: openBiddingTask,
        tasker: { name: "Ana Reyes", taskerVerification: { status: "PENDING" } },
      },
    ]);

    const result = await listApplicationsForTask({ id: "poster_1" }, "task_1");

    expect(result).toMatchObject({ ok: true, role: "poster" });
    if (!result.ok) return;
    expect(result.applications[0]).toMatchObject({
      taskerName: "Ana Reyes",
      verification: "pending",
      approvable: false,
      blockedReason: expect.stringMatching(/verification/i),
    });
  });

  it("returns only the viewer's own application to a non-Poster", async () => {
    prismaMock.bid.findMany.mockResolvedValue([
      {
        ...bidRow,
        task: openBiddingTask,
        tasker: { name: "Ana Reyes", taskerVerification: { status: "VERIFIED" } },
      },
    ]);

    const result = await listApplicationsForTask({ id: "tasker_1" }, "task_1");

    expect(result).toMatchObject({ ok: true, role: "tasker" });
    expect(prismaMock.bid.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ taskId: "task_1", taskerId: "tasker_1" }),
      }),
    );
  });
});

describe("tasker application tracking", () => {
  it("lists the signed-in Tasker's applications across tasks", async () => {
    prismaMock.bid.findMany.mockResolvedValue([
      {
        ...bidRow,
        task: openBiddingTask,
        tasker: { name: "Ana Reyes", taskerVerification: { status: "VERIFIED" } },
      },
    ]);

    const applications = await listApplicationsForTasker("tasker_1");

    expect(applications).toHaveLength(1);
    expect(applications[0]).toMatchObject({ id: "bid_1", taskId: "task_1" });
    expect(prismaMock.bid.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { taskerId: "tasker_1" } }),
    );
  });
});
