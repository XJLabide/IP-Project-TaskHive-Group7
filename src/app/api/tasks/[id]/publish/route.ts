import { ok, requireCapability } from "@/lib/api/response";
import { taskFailureResponse } from "@/lib/tasks/http";
import { updateTask } from "@/lib/tasks/service";

export const runtime = "nodejs";

/** Publishing is a lifecycle action on a draft, separate from editing fields. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requireCapability(request, "post_task");
  if (gate.response) return gate.response;

  const { id } = await context.params;
  const result = await updateTask(id, gate.actor.id, {}, { publish: true });
  if (!result.ok) return taskFailureResponse(result);

  return ok({ id: result.taskId, status: result.status });
}
