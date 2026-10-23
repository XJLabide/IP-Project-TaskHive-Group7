import { bids } from "@/lib/sample-data";
import { created, ok, problem, requireCapability } from "@/lib/api/response";
import { publishJob } from "@/lib/queue/qstash";
import { bidSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  return ok({
    taskId: id,
    bids,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireCapability(request, "apply_to_task");
  if (authResult.response) return authResult.response;
  const actor = authResult.actor;

  const parsed = bidSchema.safeParse(await request.json());
  if (!parsed.success) return problem("Invalid bid payload", 422);

  const { id } = await context.params;
  await publishJob("notify.bid.created", {
    taskId: id,
    taskerId: actor.id,
  });

  return created({
    id: "bid_created_demo",
    taskId: id,
    taskerId: actor.id,
    status: "SUBMITTED",
    verificationStatus: actor.verification,
    ...parsed.data,
  });
}
