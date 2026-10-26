import { ok, problem } from "@/lib/api/response";
import { paymentFailureResponse } from "@/lib/payments/http";
import { handleProviderEvent } from "@/lib/payments/service";

export const runtime = "nodejs";

/**
 * Provider callback. Authenticity comes from the provider signature, not a
 * session, and the event id makes retries idempotent.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const result = await handleProviderEvent({
    headers: request.headers,
    rawBody,
  });

  if (!result.ok) {
    if (result.code === "invalid_event") {
      return problem("The provider event could not be verified.", 400);
    }
    return paymentFailureResponse(result);
  }

  return ok({ received: true, outcome: result.outcome });
}
