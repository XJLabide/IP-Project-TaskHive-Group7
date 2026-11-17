import { prisma } from "@/lib/prisma";

export type PaymentHistoryItem = {
  id: string;
  taskId: string;
  taskTitle: string;
  taskStatus: string;
  role: "poster" | "tasker";
  provider: string;
  currency: string;
  amountCents: number;
  platformFeeCents: number;
  refundedCents: number;
  status: "pending" | "not_completed" | "held" | "released" | "refunded" | "under_review";
  transactionAt: Date;
  payoutReleasedAt: Date | null;
};

export type PaymentHistoryPage = {
  items: PaymentHistoryItem[];
  nextCursor: string | null;
};

/** Lists payment attempts and completed accounting events involving this account. */
export async function getPaymentHistory(userId: string, cursor?: string | null): Promise<PaymentHistoryPage> {
  const rows = await prisma.payment.findMany({
    where: {
      AND: [
        { OR: [
          { posterId: userId },
          { task: { assignment: { is: { taskerId: userId } } } },
        ] },
        { OR: [
          { status: { in: ["CHECKOUT_STARTED", "PAID_PENDING_COMPLETION", "RELEASED", "REFUNDED", "DISPUTED"] } },
          { status: "UNPAID", attemptCount: { gt: 0 } },
        ] },
      ],
    },
    select: {
      id: true,
      taskId: true,
      posterId: true,
      provider: true,
      currency: true,
      amountCents: true,
      platformFeeCents: true,
      refundedCents: true,
      attemptCount: true,
      status: true,
      updatedAt: true,
      task: {
        select: {
          title: true,
          status: true,
          assignment: { select: { taskerId: true } },
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: 51,
  });

  const hasMore = rows.length > 50;
  const payments = rows.slice(0, 50);

  const payouts = await prisma.payout.findMany({
    where: { paymentId: { in: payments.map((payment) => payment.id) }, taskerId: userId },
    select: { paymentId: true, releasedAt: true },
  });
  const releasedAtByPayment = new Map(payouts.map((payout) => [payout.paymentId, payout.releasedAt]));

  const items = payments.map((payment) => {
    const role: PaymentHistoryItem["role"] = payment.posterId === userId ? "poster" : "tasker";
    const payoutReleasedAt = releasedAtByPayment.get(payment.id) ?? null;
    const status: PaymentHistoryItem["status"] = payment.status === "UNPAID"
      ? "not_completed"
      : payment.status === "CHECKOUT_STARTED"
        ? "pending"
        : payment.status === "REFUNDED"
          ? "refunded"
          : payment.status === "DISPUTED"
            ? "under_review"
            : payment.status === "RELEASED"
              ? "released"
              : "held";

    return {
      id: payment.id,
      taskId: payment.taskId,
      taskTitle: payment.task.title,
      taskStatus: payment.task.status,
      role,
      provider: payment.provider,
      currency: payment.currency,
      amountCents: role === "tasker" ? payment.amountCents - payment.platformFeeCents : payment.amountCents,
      platformFeeCents: payment.platformFeeCents,
      refundedCents: role === "poster" ? payment.refundedCents : 0,
      status: role === "tasker" && payment.status === "RELEASED" && !payoutReleasedAt ? "held" : status,
      transactionAt: payment.updatedAt,
      payoutReleasedAt,
    };
  });
  return { items, nextCursor: hasMore ? payments.at(-1)?.id ?? null : null };
}
