import { ok, problem, problemWithCode, requireCapability } from "@/lib/api/response";
import { loadActorFromHeaders } from "@/lib/auth/actor";
import { getPublicTaskDetail } from "@/lib/tasks/discovery-service";
import { taskFailureResponse } from "@/lib/tasks/http";
import { deleteTask, updateTask } from "@/lib/tasks/service";
import { updateTaskSchema } from "@/lib/validation";

export const runtime = "nodejs";

/** Public task detail; the exact address follows the payment/assignment gate. */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const actor = await loadActorFromHeaders(request.headers);
  const detail = await getPublicTaskDetail(id, actor?.id ?? null);

  if (!detail) return problem("Task not found", 404);

  return ok(detail);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requireCapability(request, "post_task");
  if (gate.response) return gate.response;

  const parsed = updateTaskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return problemWithCode("Invalid task payload", 422, "invalid_payload");

  const { id } = await context.params;
  const { publish, ...patch } = parsed.data;
  const result = await updateTask(id, gate.actor.id, patch, { publish });
  if (!result.ok) return taskFailureResponse(result);

  return ok({
    id: result.taskId,
    status: result.status,
    clearedApplications: result.clearedApplications ?? 0,
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requireCapability(request, "post_task");
  if (gate.response) return gate.response;

  const { id } = await context.params;
  const result = await deleteTask(id, gate.actor.id);
  if (!result.ok) return taskFailureResponse(result);

  return ok({ id: result.taskId, deleted: true });
}
