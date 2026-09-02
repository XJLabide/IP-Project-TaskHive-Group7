import { ok, requireUser } from "@/lib/api/response";
import { publishJob } from "@/lib/queue/qstash";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const { id } = await context.params;
  await publishJob("notify.task.completed", {
    taskId: id,
    taskerId: authResult.session.user.id,
  });

  return ok({
    taskId: id,
    markedCompleteBy: authResult.session.user.id,
    nextStatus: "AWAITING_CONFIRMATION",
  });
}
