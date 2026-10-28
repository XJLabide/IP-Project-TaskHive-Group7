import { created, problem, requireUser } from "@/lib/api/response";
import { reviewSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const parsed = reviewSchema.safeParse(await request.json());
  if (!parsed.success) return problem("Invalid review payload", 422);

  return created({
    id: "review_created_demo",
    reviewerId: authResult.session.user.id,
    ...parsed.data,
  });
}
