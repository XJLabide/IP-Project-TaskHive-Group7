import { prisma } from "@/lib/prisma";
import { reminderCutoff } from "@/lib/completion/rules";

export type JobBacklog = {
  /** Unpaid 24-hour holds that `assignments.expire_holds` will reopen. */
  expiredHolds: number;
  /** Assignments owed their single 24-hour Poster reminder. */
  dueReminders: number;
  /** Undisputed completions past their 48-hour auto-release deadline. */
  dueAutoRelease: number;
  /** Reviews whose 14-day blind window has elapsed. */
  dueReviews: number;
  /** Notification emails waiting for their first QStash delivery. */
  pendingEmail: number;
  /** Notification emails whose deliveries failed and need a retry or support. */
  failedEmail: number;
};

/**
 * Backlog is the work each scheduled job would pick up if it ran right now.
 * It is the monitoring signal that answers "is the scheduler keeping up" for
 * every recurring job without reaching into QStash.
 */
export async function computeJobBacklog(now = new Date()): Promise<JobBacklog> {
  const reminderCutoffAt = reminderCutoff(now);

  const [
    expiredHolds,
    dueReminders,
    dueAutoRelease,
    dueReviews,
    pendingEmail,
    failedEmail,
  ] = await Promise.all([
    prisma.assignment.count({
      where: { status: "PENDING_PAYMENT", holdExpiresAt: { lte: now } },
    }),
    prisma.assignment.count({
      where: {
        status: "ACTIVE",
        reminderSentAt: null,
        completedAt: { lte: reminderCutoffAt },
        task: {
          status: "AWAITING_CONFIRMATION",
          disputes: { none: { status: "OPEN" } },
        },
      },
    }),
    prisma.assignment.count({
      where: {
        status: "ACTIVE",
        completedAt: { not: null },
        autoReleaseAt: { lte: now },
        task: {
          status: "AWAITING_CONFIRMATION",
          disputes: { none: { status: "OPEN" } },
        },
      },
    }),
    prisma.review.count({
      where: { publishedAt: null, publishAt: { lte: now } },
    }),
    prisma.notification.count({ where: { emailStatus: "PENDING" } }),
    prisma.notification.count({ where: { emailStatus: "FAILED" } }),
  ]);

  return {
    expiredHolds,
    dueReminders,
    dueAutoRelease,
    dueReviews,
    pendingEmail,
    failedEmail,
  };
}
