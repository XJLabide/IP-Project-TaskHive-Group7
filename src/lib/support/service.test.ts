import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, txMock, notifyUserMock } = vi.hoisted(() => {
  const txMock = {
    task: { updateMany: vi.fn() },
    assignment: { updateMany: vi.fn() },
    payment: { updateMany: vi.fn() },
    payout: { updateMany: vi.fn() },
    cancellationRequest: { create: vi.fn(), updateMany: vi.fn() },
    dispute: { updateMany: vi.fn() },
    report: { updateMany: vi.fn() },
    user: { updateMany: vi.fn() },
    adminAction: { create: vi.fn(), findMany: vi.fn() },
  };

  const prismaMock = {
    task: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    assignment: { updateMany: vi.fn() },
    payment: { findUnique: vi.fn(), updateMany: vi.fn() },
    payout: { updateMany: vi.fn() },
    cancellationRequest: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    dispute: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    report: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    taskerVerification: { findMany: vi.fn() },
    adminAction: { create: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
  };

  return { prismaMock, txMock, notifyUserMock: vi.fn() };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/notifications", () => ({ notifyUser: notifyUserMock }));

import {
  listSupportQueue,
  requestCancellation,
  resolveCancellation,
  resolveDispute,
  resolveReport,
  setUserStatus,
} from "./service";

const friday = new Date("2026-10-30T09:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(
    async (callback: (tx: typeof txMock) => unknown) => callback(txMock),
  );
  txMock.task.updateMany.mockResolvedValue({ count: 1 });
  txMock.assignment.updateMany.mockResolvedValue({ count: 1 });
  txMock.payment.updateMany.mockResolvedValue({ count: 1 });
  txMock.payout.updateMany.mockResolvedValue({ count: 1 });
  txMock.cancellationRequest.updateMany.mockResolvedValue({ count: 1 });
  txMock.dispute.updateMany.mockResolvedValue({ count: 1 });
  txMock.report.updateMany.mockResolvedValue({ count: 1 });
});

describe("cancellation requests", () => {
  const hiredTask = {
    id: "task_1",
    posterId: "poster_1",
    title: "Pick up groceries",
    status: "ASSIGNED" as const,
    assignment: { taskerId: "tasker_1", status: "ACTIVE" as const },
    disputes: [],
    cancellations: [],
  };

  it("pauses the task and targets review within two business days", async () => {
    prismaMock.task.findUnique.mockResolvedValue(hiredTask);
    txMock.cancellationRequest.create.mockResolvedValue({
      id: "request_1",
      taskId: "task_1",
      reviewDueAt: new Date("2026-11-03T09:00:00.000Z"),
    });

    const result = await requestCancellation({
      actorId: "poster_1",
      taskId: "task_1",
      reason: "The Tasker cannot start this week.",
      now: friday,
    });

    expect(result).toMatchObject({
      ok: true,
      request: { reviewDueAt: new Date("2026-11-03T09:00:00.000Z") },
    });
    expect(txMock.task.updateMany).toHaveBeenCalledWith({
      where: {
        id: "task_1",
        status: { in: ["ASSIGNED", "IN_PROGRESS", "AWAITING_CONFIRMATION"] },
      },
      data: { status: "CANCELLATION_REVIEW" },
    });
    expect(notifyUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "tasker_1", type: "support.cancellation_requested" }),
    );
  });

  it("refuses a second case while a dispute is open", async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      ...hiredTask,
      disputes: [{ id: "dispute_1" }],
    });

    const result = await requestCancellation({
      actorId: "tasker_1",
      taskId: "task_1",
      reason: "The scope changed completely.",
      now: friday,
    });

    expect(result).toMatchObject({ ok: false, code: "dispute_open" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

describe("admin resolution", () => {
  const cancellationCase = {
    id: "request_1",
    status: "OPEN" as const,
    taskId: "task_1",
    requestedById: "poster_1",
    task: {
      posterId: "poster_1",
      title: "Pick up groceries",
      status: "CANCELLATION_REVIEW" as const,
      assignment: { taskerId: "tasker_1" },
    },
  };

  it("refunds the payment and audits a full-refund decision", async () => {
    prismaMock.cancellationRequest.findUnique.mockResolvedValue(cancellationCase);
    prismaMock.payment.findUnique.mockResolvedValue({
      id: "payment_1",
      amountCents: 45000,
      platformFeeCents: 2250,
    });

    const result = await resolveCancellation({
      adminId: "admin_1",
      caseId: "request_1",
      outcome: "FULL_REFUND",
      notes: "No work was completed.",
      now: friday,
    });

    expect(result).toMatchObject({
      ok: true,
      outcome: "FULL_REFUND",
      payoutCents: 0,
    });
    expect(txMock.payment.updateMany).toHaveBeenCalledWith({
      where: {
        id: "payment_1",
        status: { in: ["PAID_PENDING_COMPLETION", "DISPUTED"] },
      },
      data: {
        status: "REFUNDED",
        refundedCents: 45000,
        refundedAt: friday,
      },
    });
    expect(txMock.task.updateMany).toHaveBeenCalledWith({
      where: {
        id: "task_1",
        status: { in: ["CANCELLATION_REVIEW", "DISPUTED"] },
      },
      data: { status: "CANCELLED" },
    });
    expect(txMock.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminId: "admin_1",
          action: "support.cancellation.resolve",
          targetType: "CancellationRequest",
          metadata: expect.objectContaining({ outcome: "FULL_REFUND" }),
        }),
      }),
    );
    expect(notifyUserMock).toHaveBeenCalledTimes(2);
  });

  it("refuses a payout resolution when the payment is missing", async () => {
    prismaMock.cancellationRequest.findUnique.mockResolvedValue(cancellationCase);
    prismaMock.payment.findUnique.mockResolvedValue(null);

    const result = await resolveCancellation({
      adminId: "admin_1",
      caseId: "request_1",
      outcome: "FULL_PAYOUT",
      now: friday,
    });

    expect(result).toMatchObject({ ok: false, code: "payout_missing" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects an invalid partial payout before changing anything", async () => {
    prismaMock.cancellationRequest.findUnique.mockResolvedValue(cancellationCase);
    prismaMock.payment.findUnique.mockResolvedValue({
      id: "payment_1",
      amountCents: 45000,
      platformFeeCents: 2250,
    });

    const result = await resolveCancellation({
      adminId: "admin_1",
      caseId: "request_1",
      outcome: "PARTIAL_PAYOUT",
      payoutCents: 50000,
      now: friday,
    });

    expect(result).toMatchObject({ ok: false, code: "invalid_amount" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("resolves a dispute with a partial payout and releases the payout row", async () => {
    prismaMock.dispute.findUnique.mockResolvedValue({
      id: "dispute_1",
      status: "OPEN",
      taskId: "task_1",
      openedById: "tasker_1",
      task: {
        posterId: "poster_1",
        title: "Pick up groceries",
        status: "DISPUTED",
        assignment: { taskerId: "tasker_1" },
      },
    });
    prismaMock.payment.findUnique.mockResolvedValue({
      id: "payment_1",
      amountCents: 45000,
      platformFeeCents: 2250,
    });

    const result = await resolveDispute({
      adminId: "admin_1",
      caseId: "dispute_1",
      outcome: "PARTIAL_PAYOUT",
      payoutCents: 20000,
      now: friday,
    });

    expect(result).toMatchObject({
      ok: true,
      outcome: "PARTIAL_PAYOUT",
      payoutCents: 20000,
    });
    expect(txMock.payout.updateMany).toHaveBeenCalledWith({
      where: { paymentId: "payment_1", releasedAt: null },
      data: { amountCents: 20000, releasedAt: friday },
    });
    expect(txMock.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "support.dispute.resolve",
          targetType: "Dispute",
        }),
      }),
    );
  });
});

describe("report decisions", () => {
  it("suspends the reported user and audits a report decision", async () => {
    prismaMock.report.findUnique.mockResolvedValue({
      id: "report_1",
      status: "OPEN",
      reporterId: "reporter_1",
      reportedUserId: "reported_1",
      taskId: "task_1",
    });

    const result = await resolveReport({
      adminId: "admin_1",
      reportId: "report_1",
      decision: "suspend",
      notes: "Repeated abusive messages.",
      now: friday,
    });

    expect(result).toMatchObject({ ok: true, status: "RESOLVED" });
    expect(txMock.user.updateMany).toHaveBeenCalledWith({
      where: { id: "reported_1" },
      data: { status: "SUSPENDED" },
    });
    expect(txMock.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "support.report.suspend",
          targetType: "Report",
        }),
      }),
    );
    expect(notifyUserMock).toHaveBeenCalledTimes(2);
  });

  it("dismisses a report without touching the user", async () => {
    prismaMock.report.findUnique.mockResolvedValue({
      id: "report_1",
      status: "OPEN",
      reporterId: "reporter_1",
      reportedUserId: "reported_1",
      taskId: "task_1",
    });

    const result = await resolveReport({
      adminId: "admin_1",
      reportId: "report_1",
      decision: "dismiss",
      now: friday,
    });

    expect(result).toMatchObject({ ok: true, status: "REJECTED" });
    expect(txMock.user.updateMany).not.toHaveBeenCalled();
  });
});

describe("user oversight", () => {
  it("records an audited suspension", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user_1",
      isAdmin: false,
      status: "ACTIVE",
    });

    const result = await setUserStatus({
      adminId: "admin_1",
      userId: "user_1",
      status: "SUSPENDED",
      notes: "Repeated abuse.",
    });

    expect(result).toMatchObject({ ok: true, status: "SUSPENDED" });
    expect(txMock.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user_1", isAdmin: false },
      data: { status: "SUSPENDED" },
    });
    expect(txMock.adminAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "admin.user.suspended" }),
      }),
    );
  });

  it("refuses to suspend another Admin or self", async () => {
    const self = await setUserStatus({
      adminId: "admin_1",
      userId: "admin_1",
      status: "SUSPENDED",
    });
    expect(self).toMatchObject({ ok: false, code: "forbidden" });

    prismaMock.user.findUnique.mockResolvedValue({
      id: "admin_2",
      isAdmin: true,
      status: "ACTIVE",
    });
    const otherAdmin = await setUserStatus({
      adminId: "admin_1",
      userId: "admin_2",
      status: "SUSPENDED",
    });
    expect(otherAdmin).toMatchObject({ ok: false, code: "forbidden" });
  });
});

describe("support queue", () => {
  it("combines reports, disputes, cancellations, and verification appeals", async () => {
    prismaMock.report.findMany.mockResolvedValue([
      {
        id: "report_1",
        reason: "Abuse",
        status: "OPEN",
        createdAt: friday,
        reporter: { name: "Reporter" },
        reportedUser: { name: "Reported" },
        task: { title: "Task" },
      },
    ]);
    prismaMock.dispute.findMany.mockResolvedValue([
      {
        id: "dispute_1",
        taskId: "task_1",
        reason: "Scope",
        status: "OPEN",
        createdAt: friday,
        openedBy: { name: "Ana" },
        task: { title: "Task" },
      },
    ]);
    prismaMock.cancellationRequest.findMany.mockResolvedValue([
      {
        id: "request_1",
        taskId: "task_1",
        reason: "Cannot start",
        status: "OPEN",
        createdAt: friday,
        reviewDueAt: new Date("2026-11-03T09:00:00.000Z"),
        requestedBy: { name: "Maria" },
        task: { title: "Task" },
      },
    ]);
    prismaMock.taskerVerification.findMany.mockResolvedValue([
      {
        userId: "tasker_1",
        appealedAt: friday,
        appealNote: "Please review",
        user: { name: "Tasker" },
      },
    ]);
    prismaMock.adminAction.findMany.mockResolvedValue([
      {
        id: "audit_1",
        action: "support.dispute.resolve",
        targetType: "Dispute",
        targetId: "dispute_1",
        notes: "Resolved",
        createdAt: friday,
        admin: { name: "Admin" },
      },
    ]);
    prismaMock.task.findMany.mockResolvedValue([
      {
        id: "task_1",
        title: "Task",
        status: "OPEN",
        updatedAt: friday,
        poster: { name: "Maria" },
      },
    ]);
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: "user_1",
        name: "Ana",
        status: "ACTIVE",
        isAdmin: false,
        updatedAt: friday,
      },
    ]);
    prismaMock.user.count.mockResolvedValue(10);
    prismaMock.task.count.mockResolvedValue(4);

    const queue = await listSupportQueue();

    expect(queue.totals).toEqual({
      users: 10,
      tasks: 4,
      completedTasks: 4,
      openReports: 1,
      openDisputes: 1,
      openCancellations: 1,
      pendingVerificationAppeals: 1,
    });
    expect(queue.disputes[0].dueAt).toEqual(
      new Date("2026-11-03T09:00:00.000Z"),
    );
    expect(queue.verificationAppeals[0].name).toBe("Tasker");
    expect(queue.recentTasks[0]).toMatchObject({ id: "task_1", poster: "Maria" });
    expect(queue.recentUsers[0]).toMatchObject({ id: "user_1", status: "ACTIVE" });
    expect(queue.recentDecisions[0]).toMatchObject({ admin: "Admin" });
  });
});
