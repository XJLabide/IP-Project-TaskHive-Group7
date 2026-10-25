import { ok, problem, problemWithCode, requireCapability } from "@/lib/api/response";
import { tasks } from "@/lib/sample-data";
import { taskFailureResponse } from "@/lib/tasks/http";
import { deleteTask, updateTask } from "@/lib/tasks/service";
import { updateTaskSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const task = tasks.find((item) => item.id === id);

  if (!task) return problem("Task not found", 404);

  return ok(task);
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
