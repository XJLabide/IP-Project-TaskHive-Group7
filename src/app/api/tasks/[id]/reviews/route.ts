import { ok, requireUser } from "@/lib/api/response";
import { completionFailureResponse } from "@/lib/completion/http";
import { submitReview } from "@/lib/completion/service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  const rating = Number(body.rating);
  const result = await submitReview({
    reviewerId: authResult.session.user.id,
    taskId: id,
    rating: Number.isFinite(rating) ? Math.trunc(rating) : 0,
    comment: typeof body.comment === "string" ? body.comment : null,
  });

  if (!result.ok) return completionFailureResponse(result);
  return ok(result);
}
