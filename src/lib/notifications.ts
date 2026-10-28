import { createHash } from "node:crypto";
import { after } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isTerminalNotificationEmailStatus } from "@/lib/notifications/status";
import { publishJob } from "@/lib/queue/qstash";

export type NotifyInput = {
  userId: string;
  type: string;
  title: string;
  body?: string;
  /** A stable key for the domain event, such as `chat.message:<messageId>:<recipientId>`. */
  eventKey: string;
  /** Must be a same-origin path. Defaults to the signed-in My Work page. */
  href?: string;
};

export type NotifyAdminsInput = Omit<NotifyInput, "userId" | "eventKey"> & {
  eventKey: string;
};

export type NotifyResult = {
  persisted: boolean;
  delivery: "scheduled" | "complete" | "not_scheduled";
};

function notificationEventKey(eventKey: string) {
  return createHash("sha256").update(eventKey).digest("hex");
}

export function buildNotificationCreateData(
  input: NotifyInput,
): Prisma.NotificationUncheckedCreateInput {
  return {
    eventKey: notificationEventKey(input.eventKey),
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href ?? "/my-work",
    emailStatus: "PENDING",
  };
}

async function markEnqueueFailed(notificationId: string) {
  try {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        emailStatus: "FAILED",
        emailError: "Email delivery could not be queued.",
      },
    });
  } catch {
    // Keep the marketplace action successful; the failed enqueue is logged below.
  }
  console.error("[notifications] Email delivery could not be queued", {
    notificationId,
  });
}

async function publishNotificationEmailJob(notificationId: string): Promise<void> {
  let notification;
  try {
    notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { id: true, emailStatus: true },
    });
  } catch {
    console.error("[notifications] Email job could not read its inbox record", {
      notificationId,
    });
    return;
  }
  if (
    !notification ||
    isTerminalNotificationEmailStatus(notification.emailStatus)
  ) {
    return;
  }

  try {
    const result = await publishJob(
      "notifications.deliver_email",
      { notificationId: notification.id },
      // Keep retries inside Resend's 24-hour idempotency window.
      { deduplicationId: notification.id, retries: 4 },
    );

    if (!result.queued) {
      await markEnqueueFailed(notification.id);
    }
  } catch {
    await markEnqueueFailed(notification.id);
  }
}

export async function queueNotificationEmail(notificationId: string): Promise<boolean> {
  try {
    after(() => publishNotificationEmailJob(notificationId));
    return true;
  } catch {
    await markEnqueueFailed(notificationId);
    return false;
  }
}

/**
 * Persists the inbox event before scheduling its email job after the response.
 * Replaying the event reuses its row, and QStash retries only that email.
 */
export async function notifyUser(input: NotifyInput): Promise<NotifyResult> {
  const data = buildNotificationCreateData(input);
  const eventKey = data.eventKey;
  let notification;
  try {
    notification = await prisma.notification.upsert({
      where: { eventKey },
      update: {},
      create: data,
      select: { id: true, emailStatus: true },
    });
  } catch {
    console.error("[notifications] Inbox record could not be saved", { eventKey });
    return { persisted: false, delivery: "not_scheduled" };
  }

  if (isTerminalNotificationEmailStatus(notification.emailStatus)) {
    return { persisted: true, delivery: "complete" };
  }

  return {
    persisted: true,
    delivery: (await queueNotificationEmail(notification.id))
      ? "scheduled"
      : "not_scheduled",
  };
}

/** Creates one scoped notification per Admin without exposing report details to other users. */
export async function notifyAdmins(input: NotifyAdminsInput): Promise<void> {
  let admins;
  try {
    admins = await prisma.user.findMany({
      where: { isAdmin: true },
      select: { id: true },
    });
  } catch {
    console.error("[notifications] Admin recipients could not be loaded", {
      eventKey: notificationEventKey(input.eventKey),
    });
    return;
  }

  await Promise.all(
    admins.map((admin) =>
      notifyUser({
        ...input,
        userId: admin.id,
        eventKey: `${input.eventKey}:${admin.id}`,
      }),
    ),
  );
}
