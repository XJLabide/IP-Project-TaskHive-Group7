import { created, ok, problemWithCode, requireCapability } from "@/lib/api/response";
import { loadActorFromHeaders } from "@/lib/auth/actor";
import { taskFailureResponse } from "@/lib/tasks/http";
import { parsePublicTaskQuery } from "@/lib/tasks/discovery-query";
import { listPublicTasks } from "@/lib/tasks/discovery-service";
import { createTask } from "@/lib/tasks/service";
import type { TaskFields } from "@/lib/tasks/validation";
import { createTaskSchema } from "@/lib/validation";

export const runtime = "nodejs";

/** Public discovery. Guests browse nationwide; accounts default to home + 10 km. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = parsePublicTaskQuery(searchParams);

  if (!parsed.ok) {
    return problemWithCode("Check the discovery filters.", 422, "invalid_query", {
      issues: parsed.issues,
    });
  }

  const actor = await loadActorFromHeaders(request.headers);
  const result = await listPublicTasks(parsed.query, actor?.id ?? null);

  return ok(result);
}

export async function POST(request: Request) {
  const gate = await requireCapability(request, "post_task");
  if (gate.response) return gate.response;

  const parsed = createTaskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return problemWithCode("Invalid task payload", 422, "invalid_payload");

  const fields: TaskFields = {
    title: parsed.data.title,
    description: parsed.data.description,
    category: parsed.data.category,
    budgetCents: parsed.data.budgetCents,
    deadline: parsed.data.deadline ?? null,
    fulfillmentMode: parsed.data.fulfillmentMode,
    hiringMode: parsed.data.hiringMode,
    locationLabel: parsed.data.locationLabel ?? null,
    addressLine: parsed.data.addressLine ?? null,
  };

  const result = await createTask(gate.actor.id, fields, parsed.data.publish);
  if (!result.ok) return taskFailureResponse(result);

  return created({ id: result.taskId, status: result.status });
}
