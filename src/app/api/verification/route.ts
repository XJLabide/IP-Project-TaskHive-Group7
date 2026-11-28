import { ok, problem, requireCapability } from "@/lib/api/response";
import { getVerification } from "@/lib/verification/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireCapability(request, "view_private_account");
  if (gate.response) return gate.response;

  return ok(await getVerification(gate.actor.id));
}

/** Legacy status-only submissions are blocked; verification starts with an ID upload. */
export async function POST(request: Request) {
  const gate = await requireCapability(request, "start_verification");
  if (gate.response) return gate.response;

  return problem("Upload one valid ID image to submit identity verification.", 422);
}
