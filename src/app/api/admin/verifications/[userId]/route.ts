import { ok, problem, requireCapability } from "@/lib/api/response";
import { verificationDecisionSchema } from "@/lib/validation";
import { decideAppeal, getVerification } from "@/lib/verification/service";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const gate = await requireCapability(request, "review_verification_appeal");
  if (gate.response) return gate.response;

  const { userId } = await context.params;
  return ok({ userId, state: await getVerification(userId) });
}

/** Admin decision on a rejected Tasker's one appeal. */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const gate = await requireCapability(request, "review_verification_appeal");
  if (gate.response) return gate.response;

  const parsed = verificationDecisionSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) return problem("Invalid verification decision", 422);

  const { userId } = await context.params;
  const result = await decideAppeal(
    userId,
    parsed.data.outcome,
    parsed.data.reason,
  );
  if (!result.ok) return problem(result.reason, 409);

  return ok({ userId, state: result.state });
}
