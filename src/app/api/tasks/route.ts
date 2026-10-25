import { created, ok, problem, requireCapability } from "@/lib/api/response";
import { tasks } from "@/lib/sample-data";
import { taskFailureResponse } from "@/lib/tasks/http";
import { createTask } from "@/lib/tasks/service";
import type { TaskFields } from "@/lib/tasks/validation";
import { createTaskSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const status = searchParams.get("status");

  const filteredTasks = tasks.filter((task) => {
    return (!category || task.category === category) && (!status || task.status === status);
  });

  return ok(filteredTasks);
}

export async function POST(request: Request) {
  const gate = await requireCapability(request, "post_task");
  if (gate.response) return gate.response;

  const parsed = createTaskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return problem("Invalid task payload", 422);

  const fields: TaskFields = {
    title: parsed.data.title,
    description: parsed.data.description,
    category: parsed.data.category,
    budgetCents: parsed.data.budgetCents,
    deadline: parsed.data.deadline ?? null,
    fulfillmentMode: parsed.data.fulfillmentMode,
    hiringMode: parsed.data.hiringMode,
    locationLabel: parsed.data.locationLabel ?? null,
  };

  const result = await createTask(gate.actor.id, fields, parsed.data.publish);
  if (!result.ok) return taskFailureResponse(result);

  return created({ id: result.taskId, status: result.status });
}
