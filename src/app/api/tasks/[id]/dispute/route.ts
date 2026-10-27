import { ok, requireUser } from "@/lib/api/response";
import { completionFailureResponse } from "@/lib/completion/http";
import { disputeCompletion } from "@/lib/completion/service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  const result = await disputeCompletion({
    actorId: authResult.session.user.id,
    taskId: id,
    reason: typeof body.reason === "string" ? body.reason : "",
  });

  if (!result.ok) return completionFailureResponse(result);
  return ok(result);
}
