import { ok, problem, requireAdmin } from "@/lib/api/response";
import { supportFailureResponse } from "@/lib/support/http";
import { resolveCancellation } from "@/lib/support/service";
import type { SupportOutcome } from "@/lib/support/rules";

const outcomes: SupportOutcome[] = ["FULL_REFUND", "PARTIAL_PAYOUT", "FULL_PAYOUT"];

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdmin(request);
  if (authResult.response) return authResult.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const outcome = outcomes.includes(body.outcome) ? body.outcome : null;

  if (!outcome) return problem("Invalid cancellation outcome", 422);

  const result = await resolveCancellation({
    adminId: authResult.session.user.id,
    caseId: id,
    outcome,
    payoutCents:
      typeof body.payoutCents === "number" ? body.payoutCents : undefined,
    notes: typeof body.notes === "string" ? body.notes : undefined,
  });

  if (!result.ok) return supportFailureResponse(result);
  return ok(result);
}
