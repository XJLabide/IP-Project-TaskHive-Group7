import { ok, problem, requireUser } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Lists real pending-payment tasks owned by the signed-in Poster. */
export async function GET(request: Request) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const taskId = new URL(request.url).searchParams.get("taskId")?.trim();
  if (taskId) {
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

/** Checkout stays disabled until provider attempts and callbacks are race-safe. */
export async function POST(request: Request) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const body: unknown = await request.json().catch(() => null);
  const taskId = body && typeof body === "object" && "taskId" in body && typeof body.taskId === "string"
    ? body.taskId.trim() : null;
  if (!taskId) return problem("A taskId is required to start checkout", 422);

  return problem("Checkout is temporarily unavailable. Please try again later.", 503);
}
