import { beforeEach, describe, expect, it, vi } from "vitest";
import { startCheckout, handleProviderEvent } from "./service";
import { stripeProvider, paymongoProvider } from "./provider";

const {
  prismaMock,
  txMock,
  notifyUserMock,
  buildNotificationCreateDataMock,
  queueNotificationEmailMock,
} = vi.hoisted(() => {
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
    notification: { upsert: vi.fn() },
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
    $transaction: vi.fn(),
  };

  return {
    prismaMock,
    txMock,
    notifyUserMock: vi.fn(),
    buildNotificationCreateDataMock: vi.fn((input) => ({
      ...input,
      eventKey: `hashed:${input.eventKey}`,
      href: input.href ?? "/my-work",
      emailStatus: "PENDING",
    })),
    queueNotificationEmailMock: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/notifications", () => ({
  notifyUser: notifyUserMock,
  buildNotificationCreateData: buildNotificationCreateDataMock,
  queueNotificationEmail: queueNotificationEmailMock,
}));

describe("Payment Gateway Integration - Stripe", () => {
  const secretKey = "sk_test_stripe_secret";
  const webhookSecret = "whsec_stripe_test";
  const now = new Date("2026-11-09T10:00:00.000Z");

  const mockStripeClient = {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  } as any;

  const provider = stripeProvider({
    secretKey,
    webhookSecret,
    stripeClient: mockStripeClient,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: any) =>
      callback(txMock),
    );
    txMock.task.updateMany.mockResolvedValue({ count: 1 });
    txMock.bid.updateMany.mockResolvedValue({ count: 1 });
    txMock.taskRequest.updateMany.mockResolvedValue({ count: 0 });
    txMock.assignment.updateMany.mockResolvedValue({ count: 1 });
    txMock.assignment.findUnique.mockResolvedValue({
      id: "assignment_1",
      taskerId: "tasker_1",
      status: "PENDING_PAYMENT",
      holdExpiresAt: new Date(now.getTime() + 86400000),
    });
    txMock.payment.updateMany.mockResolvedValue({ count: 1 });
    txMock.payout.upsert.mockResolvedValue({});
    txMock.paymentEvent.create.mockResolvedValue({ id: "event_1" });
    txMock.paymentEvent.update.mockResolvedValue({});
    txMock.notification.upsert.mockResolvedValue({ id: "notification_1" });
    queueNotificationEmailMock.mockResolvedValue(true);
  });

  it("completes full checkout initiation and successful webhook fulfillment", async () => {
    // 1. Setup task and assignment in Prisma
    prismaMock.task.findUnique.mockResolvedValue({
      id: "task_1",
      posterId: "poster_1",
      title: "Clean 2-bedroom condo",
      status: "PENDING_PAYMENT",
      budgetCents: 150000,
      currency: "PHP",
      hiringMode: "FIXED_PRICE",
    });

    prismaMock.assignment.findUnique.mockResolvedValue({
      status: "PENDING_PAYMENT",
      holdExpiresAt: new Date(now.getTime() + 86400000),
      taskerId: "tasker_1",
    });

    prismaMock.payment.findUnique.mockResolvedValue(null);
    prismaMock.payment.upsert.mockResolvedValue({ id: "payment_stripe_1" });
    prismaMock.payment.update.mockResolvedValue({ id: "payment_stripe_1" });

    mockStripeClient.checkout.sessions.create.mockResolvedValue({
      id: "cs_stripe_12345",
      url: "https://checkout.stripe.com/pay/cs_stripe_12345",
    });

    // 2. Start Checkout via Stripe provider
    const checkoutResult = await startCheckout({
      posterId: "poster_1",
      taskId: "task_1",
      now,
      provider,
    });

    expect(checkoutResult.ok).toBe(true);
    if (!checkoutResult.ok) return;

    expect(checkoutResult.provider).toBe("stripe");
    expect(checkoutResult.checkoutUrl).toBe("https://checkout.stripe.com/pay/cs_stripe_12345");
    expect(checkoutResult.amountCents).toBe(150000);
    expect(checkoutResult.platformFeeCents).toBe(7500); // 5% of 150,000 cents = 7,500 cents (PHP 75)
    expect(checkoutResult.payoutCents).toBe(142500);

    // Verify Stripe checkout session was called with correct metadata
    expect(mockStripeClient.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        client_reference_id: "payment_stripe_1",
        mode: "payment",
        metadata: { taskId: "task_1", paymentId: "payment_stripe_1" },
      }),
    );

    // 3. Receive Stripe Webhook for successful payment
    prismaMock.payment.findFirst.mockResolvedValue({
      id: "payment_stripe_1",
      taskId: "task_1",
      posterId: "poster_1",
      amountCents: 150000,
      platformFeeCents: 7500,
      status: "CHECKOUT_STARTED",
    });

    txMock.assignment.findUnique.mockResolvedValue({
      status: "PENDING_PAYMENT",
      taskerId: "tasker_1",
      holdExpiresAt: new Date(now.getTime() + 86400000),
    });

    mockStripeClient.webhooks.constructEvent.mockReturnValue({
      id: "evt_stripe_success_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_stripe_12345",
          amount_total: 150000,
        },
      },
    });

    const headers = new Headers({ "stripe-signature": "t=123,v1=valid" });
    const webhookResult = await handleProviderEvent({
      headers,
      rawBody: JSON.stringify({ id: "evt_stripe_success_1" }),
      now,
      provider,
    });

    expect(webhookResult.ok).toBe(true);
    if (!webhookResult.ok) return;
    expect(webhookResult.outcome).toBe("activated");

    // Verify database updates on successful activation
    expect(txMock.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "payment_stripe_1", status: { in: ["UNPAID", "CHECKOUT_STARTED"] } },
        data: expect.objectContaining({ status: "PAID_PENDING_COMPLETION" }),
      }),
    );

    expect(txMock.assignment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { taskId: "task_1", status: "PENDING_PAYMENT" },
        data: expect.objectContaining({ status: "ACTIVE" }),
      }),
    );

    expect(txMock.task.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "task_1", status: "PENDING_PAYMENT" },
        data: expect.objectContaining({ status: "ASSIGNED" }),
      }),
    );

    expect(txMock.payout.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { paymentId: "payment_stripe_1" },
        create: expect.objectContaining({
          paymentId: "payment_stripe_1",
          taskerId: "tasker_1",
          amountCents: 142500,
          platformFeeCents: 7500,
        }),
      }),
    );
  });

  it("handles payment failure webhook properly without activating assignment", async () => {
    prismaMock.payment.findFirst.mockResolvedValue({
      id: "payment_stripe_1",
      taskId: "task_1",
      posterId: "poster_1",
      amountCents: 150000,
      platformFeeCents: 7500,
      status: "CHECKOUT_STARTED",
    });

    mockStripeClient.webhooks.constructEvent.mockReturnValue({
      id: "evt_stripe_failed_1",
      type: "checkout.session.async_payment_failed",
      data: {
        object: {
          id: "cs_stripe_12345",
          amount_total: 150000,
        },
      },
    });

    const headers = new Headers({ "stripe-signature": "t=123,v1=valid" });
    const webhookResult = await handleProviderEvent({
      headers,
      rawBody: "{}",
      now,
      provider,
    });

    expect(webhookResult.ok).toBe(true);
    if (!webhookResult.ok) return;
    expect(webhookResult.outcome).toBe("failed");

    expect(txMock.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "payment_stripe_1", status: { in: ["UNPAID", "CHECKOUT_STARTED"] } },
        data: { status: "UNPAID" },
      }),
    );

    // Assignment remains pending and is not activated
    expect(txMock.assignment.updateMany).not.toHaveBeenCalled();
    expect(txMock.task.updateMany).not.toHaveBeenCalled();
  });
});

describe("Payment Gateway Integration - PayMongo", () => {
  const secretKey = "sec_paymongo_test";
  const webhookSecret = "whsec_paymongo_test";
  const now = new Date("2026-11-09T10:00:00.000Z");

  const provider = paymongoProvider({
    secretKey,
    webhookSecret,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: any) =>
      callback(txMock),
    );
    txMock.task.updateMany.mockResolvedValue({ count: 1 });
    txMock.bid.updateMany.mockResolvedValue({ count: 1 });
    txMock.taskRequest.updateMany.mockResolvedValue({ count: 0 });
    txMock.assignment.updateMany.mockResolvedValue({ count: 1 });
    txMock.assignment.findUnique.mockResolvedValue({
      id: "assignment_1",
      taskerId: "tasker_1",
      status: "PENDING_PAYMENT",
      holdExpiresAt: new Date(now.getTime() + 86400000),
    });
    txMock.payment.updateMany.mockResolvedValue({ count: 1 });
    txMock.payout.upsert.mockResolvedValue({});
    txMock.paymentEvent.create.mockResolvedValue({ id: "event_1" });
    txMock.paymentEvent.update.mockResolvedValue({});
    txMock.notification.upsert.mockResolvedValue({ id: "notification_1" });
    queueNotificationEmailMock.mockResolvedValue(true);
  });

  it("completes checkout initiation with PayMongo API", async () => {
    prismaMock.task.findUnique.mockResolvedValue({
      id: "task_2",
      posterId: "poster_2",
      title: "Deliver documents",
      status: "PENDING_PAYMENT",
      budgetCents: 60000,
      currency: "PHP",
      hiringMode: "FIXED_PRICE",
    });

    prismaMock.assignment.findUnique.mockResolvedValue({
      status: "PENDING_PAYMENT",
      holdExpiresAt: new Date(now.getTime() + 86400000),
      taskerId: "tasker_2",
    });

    prismaMock.payment.findUnique.mockResolvedValue(null);
    prismaMock.payment.upsert.mockResolvedValue({ id: "payment_paymongo_2" });
    prismaMock.payment.update.mockResolvedValue({ id: "payment_paymongo_2" });

    // Mock global fetch for PayMongo checkout session
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          id: "cs_paymongo_session_999",
          attributes: {
            checkout_url: "https://paymongo.page/checkout/cs_paymongo_session_999",
          },
        },
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const checkoutResult = await startCheckout({
      posterId: "poster_2",
      taskId: "task_2",
      now,
      provider,
    });

    expect(checkoutResult.ok).toBe(true);
    if (!checkoutResult.ok) return;

    expect(checkoutResult.provider).toBe("paymongo");
    expect(checkoutResult.checkoutUrl).toBe("https://paymongo.page/checkout/cs_paymongo_session_999");
    expect(checkoutResult.amountCents).toBe(60000);
    expect(checkoutResult.platformFeeCents).toBe(3000); // 5% fee: PHP 30
    expect(checkoutResult.payoutCents).toBe(57000);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.paymongo.com/v1/checkout_sessions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          authorization: expect.stringContaining("Basic "),
        }),
      }),
    );

    vi.unstubAllGlobals();
  });
});
