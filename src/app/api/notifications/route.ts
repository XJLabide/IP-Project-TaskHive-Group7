import { ok, requireUser } from "@/lib/api/response";
import { safeNotificationHref } from "@/lib/notifications/links";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const userId = authResult.session.user.id;
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        href: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);

  return ok({
    notifications: notifications.map((notification) => ({
      ...notification,
      href: safeNotificationHref(notification.href),
    })),
    unreadCount,
  });
}
