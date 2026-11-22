import { created, problem, requireUser } from "@/lib/api/response";
import { completionFailureResponse } from "@/lib/completion/http";
import { submitReview } from "@/lib/completion/service";
import { reviewSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return problem("Invalid review payload", 422);

  try {
    const result = await submitReview({
      reviewerId: authResult.session.user.id,
      taskId: parsed.data.taskId,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    });
    if (!result.ok) return completionFailureResponse(result);
    return created(result);
  } catch {
    return problem("The review could not be saved. Please try again later.", 503);
  }
}
