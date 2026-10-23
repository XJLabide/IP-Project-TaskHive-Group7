import { ok, problem, requireCapability } from "@/lib/api/response";
import { applyVerificationEvent, getVerification } from "@/lib/verification/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireCapability(request, "view_private_account");
  if (gate.response) return gate.response;

  return ok(await getVerification(gate.actor.id));
}

/**
 * Records that the Tasker has begun the provider check. The provider's
 * decision arrives later through the webhook; TaskHive never sees documents.
 */
export async function POST(request: Request) {
  const gate = await requireCapability(request, "start_verification");
  if (gate.response) return gate.response;

  const result = await applyVerificationEvent(gate.actor.id, { type: "submitted" });
  if (!result.ok) return problem(result.reason, 409);

  return ok(result.state, { status: 202 });
}
