import { ok, requireCapability } from "@/lib/api/response";
import { taskFailureResponse } from "@/lib/tasks/http";
import { cancelTask } from "@/lib/tasks/service";

export const runtime = "nodejs";

/** Cancelling preserves the task, its applications, and its support history. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requireCapability(request, "post_task");
  if (gate.response) return gate.response;

  const { id } = await context.params;
  const result = await cancelTask(id, gate.actor.id);
  if (!result.ok) return taskFailureResponse(result);

  return ok({ id: result.taskId, status: result.status });
}
