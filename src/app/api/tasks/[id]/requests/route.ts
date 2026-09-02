import { created, problem, requireUser } from "@/lib/api/response";
import { publishJob } from "@/lib/queue/qstash";
import { taskRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const parsed = taskRequestSchema.safeParse(await request.json());
  if (!parsed.success) return problem("Invalid request payload", 422);

  const { id } = await context.params;
  await publishJob("notify.task.requested", {
    taskId: id,
    taskerId: authResult.session.user.id,
  });

  return created({
    id: "request_created_demo",
    taskId: id,
    taskerId: authResult.session.user.id,
    status: "SUBMITTED",
    ...parsed.data,
  });
}
