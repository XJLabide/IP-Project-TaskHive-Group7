import { ok } from "@/lib/api/response";
import { expireAssignmentHolds } from "@/lib/payments/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  if (body.jobName === "assignments.expire_holds") {
    const result = await expireAssignmentHolds();
    return ok({ received: true, jobName: body.jobName, ...result });
  }

  return ok({
    received: true,
    jobName: body.jobName ?? "unknown",
  });
}
