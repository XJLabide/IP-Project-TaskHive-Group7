import { created, problem, requireUser } from "@/lib/api/response";
import { publishJob } from "@/lib/queue/qstash";
import { disputeSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const parsed = disputeSchema.safeParse(await request.json());
  if (!parsed.success) return problem("Invalid dispute payload", 422);

  await publishJob("notify.dispute.created", {
    openedById: authResult.session.user.id,
    taskId: parsed.data.taskId,
  });

  return created({
    id: "dispute_created_demo",
    openedById: authResult.session.user.id,
    status: "OPEN",
    ...parsed.data,
  });
}
