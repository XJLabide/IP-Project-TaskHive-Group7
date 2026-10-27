import { ok, requireUser } from "@/lib/api/response";
import { supportFailureResponse } from "@/lib/support/http";
import { requestCancellation } from "@/lib/support/service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const result = await requestCancellation({
    actorId: authResult.session.user.id,
    taskId: id,
    reason: typeof body.reason === "string" ? body.reason : "",
  });

  if (!result.ok) return supportFailureResponse(result);
  return ok(result);
}
