import { created, problem, requireCapability } from "@/lib/api/response";
import { verificationAppealSchema } from "@/lib/validation";
import { submitAppeal } from "@/lib/verification/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const gate = await requireCapability(request, "appeal_verification");
  if (gate.response) return gate.response;

  const parsed = verificationAppealSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) return problem("Invalid appeal payload", 422);

  const result = await submitAppeal(gate.actor.id, parsed.data.note);
  if (!result.ok) return problem(result.reason, 409);

  return created(result.state);
}
