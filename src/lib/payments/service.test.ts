import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, txMock } = vi.hoisted(() => {
  const txMock = {
    task: { updateMany: vi.fn() },
    bid: { updateMany: vi.fn() },
    taskRequest: { updateMany: vi.fn() },
    assignment: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
    payment: { updateMany: vi.fn() },
    payout: { upsert: vi.fn() },
    paymentEvent: { create: vi.fn(), update: vi.fn() },
  };

  const prismaMock = {
    task: { findUnique: vi.fn() },
    bid: { findUnique: vi.fn(), findFirst: vi.fn() },
    taskRequest: { findUnique: vi.fn() },
    assignment: { findUnique: vi.fn(), findMany: vi.fn() },
    payment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    paymentEvent: { create: vi.fn() },
    payout: { upsert: vi.fn() },
    notification: { create: vi.fn() },
    $transaction: vi.fn(),
  };

  return { prismaMock, txMock };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import {
  expireAssignmentHolds,
  handleProviderEvent,
  selectTasker,
  startCheckout,
} from "./service";
import { fakeProvider } from "./provider";

const now = new Date("2026-10-26T10:00:00.000Z");
const holdExpiresAt = new Date("2026-10-27T10:00:00.000Z");

const openTask = {
  id: "task_1",
  posterId: "poster_1",
  title: "Pick up groceries",
  status: "OPEN",
  hiringMode: "BIDDING",
  budgetCents: 45000,
  currency: "PHP",
};

const verifiedBid = {
  id: "bid_1",
  status: "SUBMITTED",
  tasker: { taskerVerification: { status: "VERIFIED" } },
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(
    async (callback: (tx: typeof txMock) => unknown) => callback(txMock),
  );
  prismaMock.task.findUnique.mockResolvedValue(openTask);
  prismaMock.bid.findUnique.mockResolvedValue(verifiedBid);
  prismaMock.bid.findFirst.mockResolvedValue({ amountCents: 45000 });
  prismaMock.taskRequest.findUnique.mockResolvedValue(null);
  prismaMock.assignment.findUnique.mockResolvedValue({
    status: "PENDING_PAYMENT",
    holdExpiresAt,
    taskerId: "tasker_1",
  });
  prismaMock.assignment.findMany.mockResolvedValue([]);
  prismaMock.payment.findUnique.mockResolvedValue(null);
  prismaMock.payment.findFirst.mockResolvedValue(null);
  prismaMock.payment.upsert.mockResolvedValue({ id: "payment_1" });
  prismaMock.payment.update.mockResolvedValue({});
  prismaMock.notification.create.mockResolvedValue({});

  txMock.task.updateMany.mockResolvedValue({ count: 1 });
  txMock.bid.updateMany.mockResolvedValue({ count: 1 });
  txMock.taskRequest.updateMany.mockResolvedValue({ count: 0 });
  txMock.assignment.updateMany.mockResolvedValue({ count: 1 });
  txMock.assignment.findUnique.mockResolvedValue({
    taskerId: "tasker_1",
    status: "PENDING_PAYMENT",
    holdExpiresAt,
  });
  txMock.assignment.upsert.mockResolvedValue({
    id: "assignment_1",
    taskId: "task_1",
    taskerId: "tasker_1",
    holdExpiresAt,
  });
  txMock.payment.updateMany.mockResolvedValue({ count: 1 });
  txMock.payout.upsert.mockResolvedValue({});
  txMock.paymentEvent.create.mockResolvedValue({ id: "event_1" });
  txMock.paymentEvent.update.mockResolvedValue({});
});

describe("selecting a Tasker", () => {
  it("opens a 24-hour hold and accepts only the selected application", async () => {
    const result = await selectTasker({
      posterId: "poster_1",
      taskId: "task_1",
      taskerId: "tasker_1",
      now,
    });

    expect(result).toMatchObject({
      ok: true,
      taskStatus: "pending_payment",
      assignment: { id: "assignment_1", taskerId: "tasker_1" },
    });
    expect(result.ok && result.assignment.holdExpiresAt.toISOString()).toBe(
      "2026-10-27T10:00:00.000Z",
    );
    expect(txMock.task.updateMany).toHaveBeenCalledWith({
      where: { id: "task_1", status: "OPEN" },
      data: { status: "PENDING_PAYMENT" },
    });
    expect(txMock.bid.updateMany).toHaveBeenCalledWith({
      where: { taskId: "task_1", taskerId: "tasker_1", status: "SUBMITTED" },
      data: { status: "ACCEPTED" },
    });
    expect(txMock.assignment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { taskId: "task_1" },
        create: expect.objectContaining({
          status: "PENDING_PAYMENT",
          holdExpiresAt,
        }),
      }),
    );
    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "tasker_1", type: "assignment.selected" }),
      }),
    );
  });

  it("refuses unverified applicants, non-open tasks, and other Posters", async () => {
    prismaMock.bid.findUnique.mockResolvedValue({
      ...verifiedBid,
      tasker: { taskerVerification: { status: "PENDING" } },
    });
    expect(
      await selectTasker({ posterId: "poster_1", taskId: "task_1", taskerId: "tasker_1" }),
    ).toMatchObject({ ok: false, code: "not_eligible" });
    expect(txMock.task.updateMany).not.toHaveBeenCalled();

    prismaMock.bid.findUnique.mockResolvedValue(verifiedBid);
    prismaMock.task.findUnique.mockResolvedValue({ ...openTask, status: "CANCELLED" });
    expect(
      await selectTasker({ posterId: "poster_1", taskId: "task_1", taskerId: "tasker_1" }),
    ).toMatchObject({ ok: false, code: "task_not_open" });

    prismaMock.task.findUnique.mockResolvedValue(openTask);
    expect(
      await selectTasker({ posterId: "someone_else", taskId: "task_1", taskerId: "tasker_1" }),
    ).toMatchObject({ ok: false, code: "forbidden" });
  });

  it("refuses a Tasker who never applied", async () => {
    prismaMock.bid.findUnique.mockResolvedValue(null);

    expect(
      await selectTasker({ posterId: "poster_1", taskId: "task_1", taskerId: "tasker_1" }),
    ).toMatchObject({ ok: false, code: "application_not_found" });
  });
});

describe("starting checkout", () => {
  const pendingTask = { ...openTask, status: "PENDING_PAYMENT" };

  beforeEach(() => {
    prismaMock.task.findUnique.mockResolvedValue(pendingTask);
  });

  it("snapshots the 5% fee and opens a provider session", async () => {
    const result = await startCheckout({
      posterId: "poster_1",
      taskId: "task_1",
      now,
      provider: fakeProvider(),
    });

    expect(result).toMatchObject({
      ok: true,
      amountCents: 45000,
      platformFeeCents: 2250,
      payoutCents: 42750,
      provider: "fake",
      checkoutUrl: "/preview?checkout=payment_1",
    });
    expect(prismaMock.payment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { taskId: "task_1" },
        create: expect.objectContaining({
          amountCents: 45000,
          platformFeeCents: 2250,
          status: "CHECKOUT_STARTED",
          attemptCount: 1,
        }),
      }),
    );
    expect(prismaMock.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ providerCheckoutId: "fake_cs_payment_1" }),
      }),
    );
  });

  it("uses the accepted bid amount on bidding tasks", async () => {
    prismaMock.bid.findFirst.mockResolvedValue({ amountCents: 50000 });

    const result = await startCheckout({
      posterId: "poster_1",
      taskId: "task_1",
      now,
      provider: fakeProvider(),
    });

    expect(result).toMatchObject({
      ok: true,
      amountCents: 50000,
      platformFeeCents: 2500,
      payoutCents: 47500,
    });
  });

  it("refuses an expired hold or an already-paid task", async () => {
    prismaMock.assignment.findUnique.mockResolvedValue({
      status: "PENDING_PAYMENT",
      holdExpiresAt: new Date("2026-10-26T09:00:00.000Z"),
      taskerId: "tasker_1",
    });
    expect(
      await startCheckout({ posterId: "poster_1", taskId: "task_1", now }),
    ).toMatchObject({ ok: false, code: "hold_expired" });

    prismaMock.assignment.findUnique.mockResolvedValue({
      status: "PENDING_PAYMENT",
      holdExpiresAt,
      taskerId: "tasker_1",
    });
    prismaMock.payment.findUnique.mockResolvedValue({
      id: "payment_1",
      status: "PAID_PENDING_COMPLETION",
    });
    expect(
      await startCheckout({ posterId: "poster_1", taskId: "task_1", now }),
    ).toMatchObject({ ok: false, code: "already_paid" });
  });
});

describe("provider callbacks", () => {
  const payment = {
    id: "payment_1",
    taskId: "task_1",
    posterId: "poster_1",
    amountCents: 45000,
    platformFeeCents: 2250,
    status: "CHECKOUT_STARTED",
  };

  function fakeEvent(event: Record<string, unknown>) {
    return handleProviderEvent({
      headers: new Headers(),
      rawBody: JSON.stringify(event),
      now,
      provider: fakeProvider(),
    });
  }

  beforeEach(() => {
    prismaMock.payment.findFirst.mockResolvedValue(payment);
  });

  it("activates the assignment and records the net payout once", async () => {
    const result = await fakeEvent({
      id: "evt_1",
      type: "succeeded",
      reference: "fake_cs_payment_1",
    });

    expect(result).toEqual({ ok: true, outcome: "activated" });
    expect(txMock.payment.updateMany).toHaveBeenCalledWith({
      where: { id: "payment_1", status: { in: ["UNPAID", "CHECKOUT_STARTED"] } },
      data: { status: "PAID_PENDING_COMPLETION" },
    });
    expect(txMock.task.updateMany).toHaveBeenCalledWith({
      where: { id: "task_1", status: "PENDING_PAYMENT" },
      data: { status: "ASSIGNED" },
    });
    expect(txMock.assignment.updateMany).toHaveBeenCalledWith({
      where: { taskId: "task_1", status: "PENDING_PAYMENT" },
      data: { status: "ACTIVE", activatedAt: now },
    });
    expect(txMock.payout.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: {
          paymentId: "payment_1",
          taskerId: "tasker_1",
          amountCents: 42750,
          platformFeeCents: 2250,
        },
      }),
    );
  });

  it("records but does not activate a payment that arrives after expiry", async () => {
    txMock.assignment.findUnique.mockResolvedValue({
      taskerId: "tasker_1",
      status: "EXPIRED",
      holdExpiresAt,
    });

    const result = await fakeEvent({
      id: "evt_late",
      type: "succeeded",
      reference: "fake_cs_payment_1",
    });

    expect(result).toEqual({ ok: true, outcome: "late" });
    expect(txMock.assignment.updateMany).not.toHaveBeenCalled();
    expect(txMock.payout.upsert).not.toHaveBeenCalled();
  });

  it("treats a repeated event id as a duplicate", async () => {
    txMock.paymentEvent.create.mockRejectedValue({ code: "P2002" });

    const result = await fakeEvent({
      id: "evt_1",
      type: "succeeded",
      reference: "fake_cs_payment_1",
    });

    expect(result).toEqual({ ok: true, outcome: "duplicate" });
    expect(txMock.payment.updateMany).not.toHaveBeenCalled();
  });

  it("returns a failed payment to unpaid without touching the hold", async () => {
    const result = await fakeEvent({
      id: "evt_failed",
      type: "failed",
      reference: "fake_cs_payment_1",
    });

    expect(result).toEqual({ ok: true, outcome: "failed" });
    expect(txMock.payment.updateMany).toHaveBeenCalledWith({
      where: { id: "payment_1", status: { in: ["UNPAID", "CHECKOUT_STARTED"] } },
      data: { status: "UNPAID" },
    });
    expect(txMock.task.updateMany).not.toHaveBeenCalled();
  });

  it("marks a refund and ignores an unknown reference", async () => {
    expect(
      await fakeEvent({ id: "evt_refund", type: "refunded", reference: "fake_cs_payment_1" }),
    ).toEqual({ ok: true, outcome: "refunded" });

    prismaMock.payment.findFirst.mockResolvedValue(null);
    expect(
      await fakeEvent({ id: "evt_unknown", type: "succeeded", reference: "cs_unknown" }),
    ).toEqual({ ok: true, outcome: "ignored" });
  });

  it("ignores a refund for a payment that was never captured", async () => {
    txMock.payment.updateMany.mockResolvedValue({ count: 0 });

    expect(
      await fakeEvent({ id: "evt_refund_unpaid", type: "refunded", reference: "fake_cs_payment_1" }),
    ).toEqual({ ok: true, outcome: "ignored" });
  });

  it("rejects an unverifiable event", async () => {
    expect(
      await handleProviderEvent({
        headers: new Headers(),
        rawBody: "not-json",
        provider: fakeProvider(),
      }),
    ).toMatchObject({ ok: false, code: "invalid_event" });
  });
});

describe("expiring payment holds", () => {
  it("reopens the task and returns the selected application to the pool", async () => {
    prismaMock.assignment.findMany.mockResolvedValue([
      {
        id: "assignment_1",
        taskId: "task_1",
        taskerId: "tasker_1",
        task: { posterId: "poster_1", title: "Pick up groceries" },
      },
    ]);

    const result = await expireAssignmentHolds({ now });

    expect(result).toEqual({ expired: 1, taskIds: ["task_1"] });
    expect(txMock.assignment.updateMany).toHaveBeenCalledWith({
      where: { id: "assignment_1", status: "PENDING_PAYMENT" },
      data: { status: "EXPIRED", expiredAt: now },
    });
    expect(txMock.task.updateMany).toHaveBeenCalledWith({
      where: { id: "task_1", status: "PENDING_PAYMENT" },
      data: { status: "OPEN" },
    });
    expect(txMock.bid.updateMany).toHaveBeenCalledWith({
      where: { taskId: "task_1", taskerId: "tasker_1", status: "ACCEPTED" },
      data: { status: "SUBMITTED" },
    });
    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "poster_1",
          type: "assignment.hold_expired",
        }),
      }),
    );
  });

  it("does not count an assignment another worker already expired", async () => {
    prismaMock.assignment.findMany.mockResolvedValue([
      {
        id: "assignment_1",
        taskId: "task_1",
        taskerId: "tasker_1",
        task: { posterId: "poster_1", title: "Pick up groceries" },
      },
    ]);
    txMock.assignment.updateMany.mockResolvedValue({ count: 0 });

    expect(await expireAssignmentHolds({ now })).toEqual({ expired: 0, taskIds: [] });
  });
});
