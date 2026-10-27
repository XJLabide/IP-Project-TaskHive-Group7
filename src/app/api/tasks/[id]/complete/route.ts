import { ok, requireUser } from "@/lib/api/response";
import { completionFailureResponse } from "@/lib/completion/http";
import { submitCompletion } from "@/lib/completion/service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  const result = await submitCompletion({
    taskerId: authResult.session.user.id,
    taskId: id,
    note: typeof body.note === "string" ? body.note : null,
    evidenceUrl:
      typeof body.evidenceUrl === "string" ? body.evidenceUrl : null,
  });

  if (!result.ok) return completionFailureResponse(result);
  return ok(result);
}
