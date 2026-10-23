import { timingSafeEqual } from "node:crypto";
import { ok, problem } from "@/lib/api/response";
import { providerCallbackSchema } from "@/lib/validation";
import { applyProviderResult } from "@/lib/verification/service";

export const runtime = "nodejs";

function authorized(request: Request): boolean {
  const secret = process.env.VERIFICATION_WEBHOOK_SECRET;
  const provided = request.headers.get("x-verification-secret");

  if (!secret || !provided) return false;

  const expected = Buffer.from(secret);
  const received = Buffer.from(provided);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

/**
 * Verification-provider callback boundary.
 *
 * The provider keeps identity documents. This endpoint reads only a decision,
 * its reference, and an optional reason; anything else in the body is dropped
 * before it can reach storage.
 */
export async function POST(request: Request) {
  if (!process.env.VERIFICATION_WEBHOOK_SECRET) {
    return problem("The verification provider is not configured.", 503);
  }

  if (!authorized(request)) {
    return problem("Invalid verification webhook credentials.", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = providerCallbackSchema.safeParse(body);
  if (!parsed.success) return problem("Invalid verification webhook payload", 422);

  const result = await applyProviderResult(parsed.data.userId, body);
  if (!result.ok) {
    if (result.code === "invalid_provider_result") {
      return problem(result.reason, 422);
    }
    return problem(result.reason, 409);
  }

  return ok({ userId: parsed.data.userId, state: result.state });
}
