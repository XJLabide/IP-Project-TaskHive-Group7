import { created, requireUser } from "@/lib/api/response";
import { publishJob } from "@/lib/queue/qstash";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const body = await request.json().catch(() => ({}));
  await publishJob("notify.payment.checkout_started", {
    taskId: body.taskId,
    posterId: authResult.session.user.id,
  });

  return created({
    checkoutSessionId: "cs_test_taskhive_demo",
    taskId: body.taskId,
    posterId: authResult.session.user.id,
    status: "CHECKOUT_STARTED",
    note: "Wire this to Stripe Checkout when STRIPE_SECRET_KEY is configured.",
  });
}
