import { ok, requireUser } from "@/lib/api/response";
import { completionFailureResponse } from "@/lib/completion/http";
import { confirmCompletion } from "@/lib/completion/service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const { id } = await context.params;
  const result = await confirmCompletion({
    posterId: authResult.session.user.id,
    taskId: id,
  });

  if (!result.ok) return completionFailureResponse(result);
  return ok(result);
}
