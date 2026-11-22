import { created, problem, requireUser } from "@/lib/api/response";
import { completionFailureResponse } from "@/lib/completion/http";
import { disputeCompletion } from "@/lib/completion/service";
import { disputeSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const parsed = disputeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return problem("Invalid dispute payload", 422);

  try {
    const result = await disputeCompletion({
      actorId: authResult.session.user.id,
      taskId: parsed.data.taskId,
      reason: parsed.data.reason,
    });
    if (!result.ok) return completionFailureResponse(result);
    return created(result);
  } catch {
    return problem("The dispute could not be saved. Please try again later.", 503);
  }
}
