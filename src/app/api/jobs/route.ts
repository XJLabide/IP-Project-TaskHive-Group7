import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { ok, problem } from "@/lib/api/response";
import {
  autoReleaseCompletions,
  publishDueReviews,
  sendCompletionReminders,
} from "@/lib/completion/service";
import { deliverNotificationEmail as deliverEmail } from "@/lib/notifications/email";
import { expireAssignmentHolds } from "@/lib/payments/service";

export const runtime = "nodejs";

async function handleJob(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return problem("Invalid background job payload", 422);
  }

  const job = body as Record<string, unknown>;
  switch (job.jobName) {
    case "notifications.deliver_email": {
      if (typeof job.notificationId !== "string" || !job.notificationId) {
        return problem("Missing notification ID", 422);
      }
      const result = await deliverEmail(job.notificationId);
      return ok({ received: true, jobName: job.jobName, ...result });
    }
    case "assignments.expire_holds": {
      const result = await expireAssignmentHolds();
      return ok({ received: true, jobName: job.jobName, ...result });
    }
    case "completions.send_reminders": {
      const result = await sendCompletionReminders();
      return ok({ received: true, jobName: job.jobName, ...result });
    }
    case "completions.auto_release": {
      const result = await autoReleaseCompletions();
      return ok({ received: true, jobName: job.jobName, ...result });
    }
    case "reviews.publish_due": {
      const result = await publishDueReviews();
      return ok({ received: true, jobName: job.jobName, ...result });
    }
    default:
      return problem("Unsupported background job", 422);
  }
}

export async function POST(request: Request) {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!currentSigningKey || !nextSigningKey) {
    return problem("Background job signature validation is not configured", 503);
  }

  const destinationUrl = process.env.QSTASH_DESTINATION_URL;
  return verifySignatureAppRouter(handleJob, {
    currentSigningKey,
    nextSigningKey,
    ...(destinationUrl ? { url: destinationUrl } : {}),
  })(request);
}
