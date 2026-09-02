import { created, requireUser } from "@/lib/api/response";
import { publishJob } from "@/lib/queue/qstash";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  await publishJob("notify.hiring.approved", {
    taskId: id,
    taskerId: body.taskerId,
  });

  return created({
    id: "assignment_created_demo",
    taskId: id,
    posterId: authResult.session.user.id,
    taskerId: body.taskerId ?? "tasker_demo",
    nextStatus: "PENDING_PAYMENT",
  });
}
