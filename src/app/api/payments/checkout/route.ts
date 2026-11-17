import { created, ok, problem, requireUser } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { refreshMayaSandboxPaymentStatus, startCheckout } from "@/lib/payments/service";
import { paymentFailureResponse } from "@/lib/payments/http";

export const runtime = "nodejs";

/** Lists real pending-payment tasks owned by the signed-in Poster. */
export async function GET(request: Request) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const taskId = new URL(request.url).searchParams.get("taskId")?.trim();
  if (taskId) {
    await refreshMayaSandboxPaymentStatus({ posterId: authResult.session.user.id, taskId });
    const task = await prisma.task.findFirst({
      where: { id: taskId, posterId: authResult.session.user.id },
      select: { assignment: { select: { status: true } }, payments: { select: { status: true }, take: 1 } },
    });
    if (!task) return problem("Task not found", 404);
    const payment = task.payments[0]?.status;
    const status = payment === "UNPAID" ? "unpaid"
      : payment === "REFUNDED" ? "refunded"
      : payment === "RELEASED" || (payment === "PAID_PENDING_COMPLETION" && task.assignment?.status === "ACTIVE") ? "confirmed"
      : payment === "PAID_PENDING_COMPLETION" || payment === "DISPUTED" ? "needs_attention"
      : "pending";
    return ok({ status });
  }

  const tasks = await prisma.task.findMany({
    where: {
      posterId: authResult.session.user.id,
      status: "PENDING_PAYMENT",
      assignment: { is: { status: "PENDING_PAYMENT" } },
    },
    select: { id: true, title: true },
    orderBy: { updatedAt: "desc" },
  });
  return ok({ tasks });
}

/** Starts Maya sandbox checkout outside the production deployment only. */
export async function POST(request: Request) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const body: unknown = await request.json().catch(() => null);
  const taskId = body && typeof body === "object" && "taskId" in body && typeof body.taskId === "string"
    ? body.taskId.trim() : null;
  if (!taskId) return problem("A taskId is required to start checkout", 422);

  if (
    process.env.PAYMENT_PROVIDER !== "maya" ||
    process.env.MAYA_MODE !== "sandbox" ||
    process.env.VERCEL_ENV === "production" ||
    (process.env.NODE_ENV === "production" && !process.env.VERCEL_ENV)
  ) {
    return problem("Checkout is unavailable outside a configured Maya sandbox.", 503);
  }

  const result = await startCheckout({
    posterId: authResult.session.user.id,
    taskId,
    baseUrl: new URL(request.url).origin,
  });
  if (!result.ok) return paymentFailureResponse(result);

  return created({
    paymentId: result.paymentId,
    provider: result.provider,
    checkoutUrl: result.checkoutUrl,
    amountCents: result.amountCents,
    platformFeeCents: result.platformFeeCents,
    payoutCents: result.payoutCents,
    holdExpiresAt: result.holdExpiresAt,
  });
}
