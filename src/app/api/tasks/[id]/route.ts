import { ok, problem, requireUser } from "@/lib/api/response";
import { tasks } from "@/lib/sample-data";

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
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const { id } = await context.params;

  return ok({
    id,
    updatedBy: authResult.session.user.id,
    status: "updated_demo",
  });
}
