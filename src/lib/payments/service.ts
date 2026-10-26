import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notifications";
import { isUniqueViolation } from "@/lib/db/errors";
import { canApprove } from "@/lib/applications/rules";
import { toDomainApplicationStatus } from "@/lib/applications/mapping";
import { toDomainStatus as toDomainVerification } from "@/lib/verification/mapping";
import { toDomainHiring, toDomainTaskStatus } from "@/lib/tasks/mapping";
import { holdExpiresAt, isHoldExpired } from "./hold";
import { platformFeeCents } from "./fee";
import {
  selectPaymentProvider,
  type PaymentProvider,
} from "./provider";

export type PaymentFailureCode =
  | "not_found"
  | "forbidden"
  | "task_not_open"
  | "application_not_found"
  | "not_eligible"
  | "hold_expired"
  | "already_paid"
  | "not_pending_payment"
  | "provider_error"
  | "invalid_event";

export type PaymentFailure = {
  ok: false;
  code: PaymentFailureCode;
  reason: string;
};

export type SelectionResult =
  | {
      ok: true;
      assignment: {
        id: string;
        taskId: string;
        taskerId: string;
        holdExpiresAt: Date;
      };
      taskStatus: "pending_payment";
    }
  | PaymentFailure;

export type CheckoutResult =
  | {
      ok: true;
      paymentId: string;
      provider: string;
      checkoutUrl: string;
      amountCents: number;
      platformFeeCents: number;
      payoutCents: number;
      holdExpiresAt: Date;
    }
  | PaymentFailure;

export type EventOutcome =
  | "activated"
  | "failed"
  | "refunded"
  | "ignored"
  | "duplicate"
  | "late";

export type ProviderEventResult =
  | {
      ok: true;
      outcome: EventOutcome;
    }
  | PaymentFailure;

export type ExpiryResult = {
  expired: number;
  taskIds: string[];
};

function failure(code: PaymentFailureCode, reason: string): PaymentFailure {
  return { ok: false, code, reason };
}

/**
 * Selects exactly one eligible Tasker and opens the 24-hour payment hold.
 * Other applications stay SUBMITTED and new ones are blocked by the task
 * leaving the open state.
 */
export async function selectTasker(input: {
  posterId: string;
  taskId: string;
  taskerId: string;
  now?: Date;
}): Promise<SelectionResult> {
  const now = input.now ?? new Date();
  const task = await prisma.task.findUnique({
    where: { id: input.taskId },
    select: {
      id: true,
      posterId: true,
      title: true,
      status: true,
      hiringMode: true,
    },
  });

  if (!task) return failure("not_found", "Task not found.");
  if (task.posterId !== input.posterId) {
    return failure("forbidden", "Only the Poster who owns this task can hire.");
  }
  if (task.status !== "OPEN") {
    return failure("task_not_open", "This task is not open for hiring.");
  }

  const [bid, request] = await Promise.all([
    prisma.bid.findUnique({
      where: { taskId_taskerId: { taskId: task.id, taskerId: input.taskerId } },
      select: {
        id: true,
        status: true,
        tasker: { select: { taskerVerification: { select: { status: true } } } },
      },
    }),
    prisma.taskRequest.findUnique({
      where: { taskId_taskerId: { taskId: task.id, taskerId: input.taskerId } },
      select: {
        id: true,
        status: true,
        tasker: { select: { taskerVerification: { select: { status: true } } } },
      },
    }),
  ]);

  const kind = toDomainHiring[task.hiringMode] === "bidding" ? "bid" : "request";
  const application = kind === "bid" ? bid : request;

  if (!application) {
    return failure("application_not_found", "This Tasker has not applied to the task.");
  }

  const verification = toDomainVerification[
    application.tasker?.taskerVerification?.status ?? "NOT_STARTED"
  ];
  const decision = canApprove({
    applicationStatus: toDomainApplicationStatus[application.status],
    taskStatus: toDomainTaskStatus[task.status],
    verification,
  });

  if (!decision.allowed) return failure("not_eligible", decision.reason);

  const expiresAt = holdExpiresAt(now);

  const assignment = await prisma.$transaction(async (tx) => {
    const moved = await tx.task.updateMany({
      where: { id: task.id, status: "OPEN" },
      data: { status: "PENDING_PAYMENT" },
    });
    if (moved.count === 0) return null;

    if (kind === "bid") {
      await tx.bid.updateMany({
        where: {
          taskId: task.id,
          taskerId: input.taskerId,
          status: "SUBMITTED",
        },
        data: { status: "ACCEPTED" },
      });
    } else {
      await tx.taskRequest.updateMany({
        where: {
          taskId: task.id,
          taskerId: input.taskerId,
          status: "SUBMITTED",
        },
        data: { status: "ACCEPTED" },
      });
    }

    return tx.assignment.upsert({
      where: { taskId: task.id },
      update: {
        taskerId: input.taskerId,
        status: "PENDING_PAYMENT",
        holdExpiresAt: expiresAt,
        activatedAt: null,
        expiredAt: null,
      },
      create: {
        taskId: task.id,
        taskerId: input.taskerId,
        status: "PENDING_PAYMENT",
        holdExpiresAt: expiresAt,
      },
      select: { id: true, taskId: true, taskerId: true, holdExpiresAt: true },
    });
  });

  if (!assignment) {
    return failure("task_not_open", "The task changed before the selection was saved.");
  }

  await notifyUser({
    userId: input.taskerId,
    type: "assignment.selected",
    title: "You were selected for a task",
    job: "notify.assignment.selected",
    jobBody: { taskId: task.id, taskerId: input.taskerId, holdExpiresAt: expiresAt },
  });

  return {
    ok: true,
    assignment: {
      id: assignment.id,
      taskId: assignment.taskId,
      taskerId: assignment.taskerId,
      holdExpiresAt: assignment.holdExpiresAt ?? expiresAt,
    },
    taskStatus: "pending_payment",
  };
}

function currencyOrDefault(currency: string | null): string {
  return currency ?? "PHP";
}

/** Opens or retries provider checkout; activation only happens on the callback. */
export async function startCheckout(input: {
  posterId: string;
  taskId: string;
  baseUrl?: string;
  now?: Date;
  provider?: PaymentProvider;
}): Promise<CheckoutResult> {
  const now = input.now ?? new Date();
  const provider = input.provider ?? selectPaymentProvider();
  const task = await prisma.task.findUnique({
    where: { id: input.taskId },
    select: {
      id: true,
      posterId: true,
      title: true,
      status: true,
      budgetCents: true,
      currency: true,
      hiringMode: true,
    },
  });

  if (!task) return failure("not_found", "Task not found.");
  if (task.posterId !== input.posterId) {
    return failure("forbidden", "Only the Poster who owns this task can pay.");
  }
  if (task.status !== "PENDING_PAYMENT") {
    return failure("not_pending_payment", "This task is not waiting for payment.");
  }

  // Bidding tasks charge the accepted bid; fixed-price tasks charge the price.
  let amountCents = task.budgetCents;
  if (toDomainHiring[task.hiringMode] === "bidding") {
    const acceptedBid = await prisma.bid.findFirst({
      where: { taskId: task.id, status: "ACCEPTED" },
      select: { amountCents: true },
    });
    if (!acceptedBid) {
      return failure("application_not_found", "The selected bid could not be found.");
    }
    amountCents = acceptedBid.amountCents;
  }

  const assignment = await prisma.assignment.findUnique({
    where: { taskId: task.id },
    select: { status: true, holdExpiresAt: true, taskerId: true },
  });

  if (!assignment || assignment.status !== "PENDING_PAYMENT") {
    return failure("not_found", "There is no payment hold for this task.");
  }

  if (isHoldExpired(assignment.holdExpiresAt, now)) {
    // Reopen the task now so the Poster sees the true state, then refuse.
    await expireAssignmentHolds({ now });
    return failure("hold_expired", "The 24-hour payment window has passed.");
  }

  const existing = await prisma.payment.findUnique({
    where: { taskId: task.id },
    select: { id: true, status: true },
  });

  if (
    existing &&
    (existing.status === "PAID_PENDING_COMPLETION" ||
      existing.status === "RELEASED")
  ) {
    return failure("already_paid", "This task is already paid.");
  }

  const fee = platformFeeCents(amountCents);
  const payment = await prisma.payment.upsert({
    where: { taskId: task.id },
    update: {
      provider: provider.name,
      status: "CHECKOUT_STARTED",
      attemptCount: { increment: 1 },
      amountCents,
      platformFeeCents: fee,
    },
    create: {
      taskId: task.id,
      posterId: input.posterId,
      provider: provider.name,
      status: "CHECKOUT_STARTED",
      attemptCount: 1,
      amountCents,
      platformFeeCents: fee,
      currency: currencyOrDefault(task.currency),
    },
    select: { id: true },
  });

  const baseUrl = input.baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  let session;
  try {
    session = await provider.createCheckout({
      taskId: task.id,
      paymentId: payment.id,
      amountCents,
      currency: currencyOrDefault(task.currency),
      description: task.title,
      successUrl: `${baseUrl}/tasks/${task.id}?payment=success`,
      cancelUrl: `${baseUrl}/tasks/${task.id}?payment=cancelled`,
    });
  } catch {
    await prisma.payment.updateMany({
      where: { id: payment.id, status: "CHECKOUT_STARTED" },
      data: { status: "UNPAID" },
    });
    return failure("provider_error", "The payment provider could not start checkout.");
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      providerCheckoutId: session.reference,
      checkoutUrl: session.url,
    },
  });

  return {
    ok: true,
    paymentId: payment.id,
    provider: session.provider,
    checkoutUrl: session.url,
    amountCents,
    platformFeeCents: fee,
    payoutCents: amountCents - fee,
    holdExpiresAt: assignment.holdExpiresAt ?? now,
  };
}

type EventPayment = {
  id: string;
  taskId: string;
  posterId: string;
  amountCents: number;
  platformFeeCents: number;
  status: string;
};

async function applySucceededEvent(
  tx: Prisma.TransactionClient,
  event: { amountCents: number | null },
  payment: EventPayment,
  now: Date,
): Promise<"activated" | "duplicate" | "late" | "ignored"> {
  if (event.amountCents !== null && event.amountCents !== payment.amountCents) {
    // Never activate on an amount that does not match the checkout snapshot.
    return "ignored";
  }

  const paid = await tx.payment.updateMany({
    where: {
      id: payment.id,
      status: { in: ["UNPAID", "CHECKOUT_STARTED"] },
    },
    data: { status: "PAID_PENDING_COMPLETION" },
  });

  if (paid.count === 0) return "duplicate";

  const assignment = await tx.assignment.findUnique({
    where: { taskId: payment.taskId },
    select: { taskerId: true, status: true, holdExpiresAt: true },
  });

  // A payment captured after the hold expired is recorded but not activated;
  // support must refund it rather than silently assigning the Tasker.
  if (
    !assignment ||
    assignment.status !== "PENDING_PAYMENT" ||
    isHoldExpired(assignment.holdExpiresAt, now)
  ) {
    return "late";
  }

  await tx.task.updateMany({
    where: { id: payment.taskId, status: "PENDING_PAYMENT" },
    data: { status: "ASSIGNED" },
  });

  await tx.assignment.updateMany({
    where: { taskId: payment.taskId, status: "PENDING_PAYMENT" },
    data: { status: "ACTIVE", activatedAt: now },
  });

  await tx.payout.upsert({
    where: { paymentId: payment.id },
    update: {},
    create: {
      paymentId: payment.id,
      taskerId: assignment.taskerId,
      amountCents: payment.amountCents - payment.platformFeeCents,
      platformFeeCents: payment.platformFeeCents,
    },
  });

  return "activated";
}

/**
 * Applies a verified provider callback exactly once. The event row and the
 * state change share one transaction, so a retry cannot double-activate.
 */
export async function handleProviderEvent(input: {
  headers: Headers;
  rawBody: string;
  now?: Date;
  provider?: PaymentProvider;
}): Promise<ProviderEventResult> {
  const now = input.now ?? new Date();
  const provider = input.provider ?? selectPaymentProvider();
  const event = await provider.parseWebhook(input.headers, input.rawBody);
  if (!event) return failure("invalid_event", "The provider event could not be verified.");

  const payment = await prisma.payment.findFirst({
    where: { provider: provider.name, providerCheckoutId: event.reference },
    select: {
      id: true,
      taskId: true,
      posterId: true,
      amountCents: true,
      platformFeeCents: true,
      status: true,
    },
  });

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const recorded = await tx.paymentEvent.create({
        data: {
          provider: provider.name,
          eventId: event.id,
          type: event.type,
          providerReference: event.reference,
          paymentId: payment?.id ?? null,
        },
        select: { id: true },
      });

      let result: EventOutcome;

      if (!payment) {
        result = "ignored";
      } else if (event.type === "succeeded") {
        result = await applySucceededEvent(tx, event, payment, now);
      } else if (event.type === "failed") {
        await tx.payment.updateMany({
          where: {
            id: payment.id,
            status: { in: ["UNPAID", "CHECKOUT_STARTED"] },
          },
          data: { status: "UNPAID" },
        });
        result = "failed";
      } else {
        const refunded = await tx.payment.updateMany({
          where: {
            id: payment.id,
            status: { in: ["PAID_PENDING_COMPLETION", "RELEASED", "DISPUTED"] },
          },
          data: { status: "REFUNDED" },
        });
        result = refunded.count > 0 ? "refunded" : "ignored";
      }

      await tx.paymentEvent.update({
        where: { id: recorded.id },
        data: { processedAt: now },
      });

      return result;
    });

    if (outcome === "activated" && payment) {
      const assignment = await prisma.assignment.findUnique({
        where: { taskId: payment.taskId },
        select: { taskerId: true },
      });
      if (assignment) {
        await notifyUser({
          userId: assignment.taskerId,
          type: "assignment.active",
          title: "Payment received — the task is yours",
          job: "notify.assignment.activated",
          jobBody: { taskId: payment.taskId, taskerId: assignment.taskerId },
        });
      }
    }

    return { ok: true, outcome };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: true, outcome: "duplicate" };
    throw error;
  }
}

/**
 * Reopens tasks whose 24-hour hold expired unpaid. The selected application
 * returns to the pending pool with the other applications.
 */
export async function expireAssignmentHolds(input: {
  now?: Date;
} = {}): Promise<ExpiryResult> {
  const now = input.now ?? new Date();
  const due = await prisma.assignment.findMany({
    where: {
      status: "PENDING_PAYMENT",
      holdExpiresAt: { lte: now },
    },
    select: {
      id: true,
      taskId: true,
      taskerId: true,
      task: { select: { posterId: true, title: true } },
    },
  });

  const expiredTaskIds: string[] = [];

  for (const assignment of due) {
    const expired = await prisma.$transaction(async (tx) => {
      const updated = await tx.assignment.updateMany({
        where: { id: assignment.id, status: "PENDING_PAYMENT" },
        data: { status: "EXPIRED", expiredAt: now },
      });
      if (updated.count === 0) return false;

      await tx.task.updateMany({
        where: { id: assignment.taskId, status: "PENDING_PAYMENT" },
        data: { status: "OPEN" },
      });
      await tx.bid.updateMany({
        where: {
          taskId: assignment.taskId,
          taskerId: assignment.taskerId,
          status: "ACCEPTED",
        },
        data: { status: "SUBMITTED" },
      });
      await tx.taskRequest.updateMany({
        where: {
          taskId: assignment.taskId,
          taskerId: assignment.taskerId,
          status: "ACCEPTED",
        },
        data: { status: "SUBMITTED" },
      });
      await tx.payment.updateMany({
        where: {
          taskId: assignment.taskId,
          status: { in: ["UNPAID", "CHECKOUT_STARTED"] },
        },
        data: { status: "UNPAID" },
      });

      return true;
    });

    if (expired) expiredTaskIds.push(assignment.taskId);
  }

  for (const taskId of expiredTaskIds) {
    const assignment = due.find((item) => item.taskId === taskId);
    if (!assignment) continue;

    await notifyUser({
      userId: assignment.task.posterId,
      type: "assignment.hold_expired",
      title: "Payment window expired — the task reopened",
      job: "notify.assignment.hold_expired",
      jobBody: { taskId, taskerId: assignment.taskerId },
    });
  }

  return { expired: expiredTaskIds.length, taskIds: expiredTaskIds };
}
