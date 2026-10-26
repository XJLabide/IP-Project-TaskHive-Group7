import { created, problem, requireUser } from "@/lib/api/response";
import { paymentFailureResponse } from "@/lib/payments/http";
import { selectTasker } from "@/lib/payments/service";

export const runtime = "nodejs";

/**
 * The Poster selects one eligible Tasker. The task and Tasker enter the
 * 24-hour payment hold; other applications stay pending.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const taskerId = typeof body.taskerId === "string" ? body.taskerId : null;

  if (!taskerId) return problem("A taskerId is required to hire", 422);

  const result = await selectTasker({
    posterId: authResult.session.user.id,
    taskId: id,
    taskerId,
  });
  if (!result.ok) return paymentFailureResponse(result);

  return created({
    assignmentId: result.assignment.id,
    taskId: result.assignment.taskId,
    taskerId: result.assignment.taskerId,
    taskStatus: result.taskStatus,
    holdExpiresAt: result.assignment.holdExpiresAt,
  });
}
