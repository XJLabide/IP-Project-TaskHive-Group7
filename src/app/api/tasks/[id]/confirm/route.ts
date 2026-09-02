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
  await publishJob("notify.payment.released", {
    taskId: id,
    posterId: authResult.session.user.id,
  });

  return ok({
    taskId: id,
    confirmedBy: authResult.session.user.id,
    taskStatus: "COMPLETED",
    paymentStatus: "RELEASED",
  });
}
