import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email/send";
import { absoluteNotificationUrl } from "@/lib/notifications/links";
import { isTerminalNotificationEmailStatus } from "@/lib/notifications/status";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

/** Sends one persisted notification; QStash retries this function on failure. */
export async function deliverNotificationEmail(notificationId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: {
      id: true,
      title: true,
      body: true,
      href: true,
      emailStatus: true,
      user: { select: { email: true, emailVerified: true } },
    },
  });

  if (!notification) throw new Error("Notification was not found.");

  if (isTerminalNotificationEmailStatus(notification.emailStatus)) {
    return { status: notification.emailStatus };
  }

  if (!notification.user.email || !notification.user.emailVerified) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: { emailStatus: "SKIPPED", emailError: null },
    });
    return { status: "SKIPPED" as const };
  }

  const title = notification.title;
  const body = notification.body ?? "Sign in to TaskHive to review this update.";

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) throw new Error("TaskHive app URL is not configured.");
    const url = absoluteNotificationUrl(notification.href, appUrl);
    const text = `${title}\n\n${body}\n\nOpen TaskHive: ${url}`;
    const html = `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p><p><a href="${escapeHtml(url)}">Open TaskHive</a></p>`;
    const result = await sendMail({
      to: notification.user.email,
      subject: `TaskHive: ${title}`,
      text,
      html,
      idempotencyKey: `taskhive-notification-${notification.id}`,
    });

    if (!result.delivered) {
      throw new Error(result.reason ?? "Email provider did not accept the message.");
    }

    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        emailStatus: "SENT",
        emailSentAt: new Date(),
        emailError: null,
      },
    });

    return { status: "SENT" as const };
  } catch {
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        emailStatus: "FAILED",
        emailError: "Email delivery failed; queued retries may try again.",
      },
    });
    throw new Error("Notification email delivery failed.");
  }
}
