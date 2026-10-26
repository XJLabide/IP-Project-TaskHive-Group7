import { prisma } from "@/lib/prisma";
import { publishJob } from "@/lib/queue/qstash";

export type NotifyInput = {
  userId: string;
  type: string;
  title: string;
  /** The email/queue job to attempt after the in-app row is committed. */
  job: string;
  jobBody: Record<string, unknown>;
};

/**
 * Writes the in-app notification first, then queues the email best-effort.
 * A queue failure never rolls back marketplace state.
 */
export async function notifyUser(input: NotifyInput): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
    },
  });

  try {
    await publishJob(input.job, input.jobBody);
  } catch {
    // The in-app notification is committed; email delivery can retry.
  }
}
