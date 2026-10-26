import { created, problem, requireUser } from "@/lib/api/response";
import { paymentFailureResponse } from "@/lib/payments/http";
import { startCheckout } from "@/lib/payments/service";

export const runtime = "nodejs";

/**
 * Starts or retries provider checkout for a task in the payment hold. The
 * assignment only activates from the provider callback, never from here.
 */
export async function POST(request: Request) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const body = await request.json().catch(() => ({}));
  const taskId = typeof body.taskId === "string" ? body.taskId : null;
  if (!taskId) return problem("A taskId is required to start checkout", 422);

  const result = await startCheckout({
    posterId: authResult.session.user.id,
    taskId,
    baseUrl: new URL(request.url).origin,
  });
  if (!result.ok) return paymentFailureResponse(result);

  return created({
    paymentId: result.paymentId,
    provider: result.provider,
    checkoutUrl: result.checkoutUrl,
    amountCents: result.amountCents,
    platformFeeCents: result.platformFeeCents,
    payoutCents: result.payoutCents,
    holdExpiresAt: result.holdExpiresAt,
  });
}
