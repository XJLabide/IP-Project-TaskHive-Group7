import { ok } from "@/lib/api/response";
import {
  autoReleaseCompletions,
  publishDueReviews,
  sendCompletionReminders,
} from "@/lib/completion/service";
import { expireAssignmentHolds } from "@/lib/payments/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  if (body.jobName === "assignments.expire_holds") {
    const result = await expireAssignmentHolds();
    return ok({ received: true, jobName: body.jobName, ...result });
  }

  if (body.jobName === "completions.send_reminders") {
    const result = await sendCompletionReminders();
    return ok({ received: true, jobName: body.jobName, ...result });
  }

  if (body.jobName === "completions.auto_release") {
    const result = await autoReleaseCompletions();
    return ok({ received: true, jobName: body.jobName, ...result });
  }

  if (body.jobName === "reviews.publish_due") {
    const result = await publishDueReviews();
    return ok({ received: true, jobName: body.jobName, ...result });
  }

  return ok({
    received: true,
    jobName: body.jobName ?? "unknown",
  });
}
