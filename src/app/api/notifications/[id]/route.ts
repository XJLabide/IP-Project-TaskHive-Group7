import { ok, problem, requireUser } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const { id } = await context.params;
  const userId = authResult.session.user.id;
  const readAt = new Date();
  const updated = await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt },
  });

  if (updated.count > 0) return ok({ id, readAt });

  const existing = await prisma.notification.findFirst({
    where: { id, userId },
    select: { readAt: true },
  });
  if (!existing) return problem("Notification not found", 404);

  return ok({ id, readAt: existing.readAt });
}
