import { ok, requireAdmin } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { listSupportQueue } from "@/lib/support/service";

export const runtime = "nodejs";

/** Admin overview backed by marketplace records, not sample metrics. */
export async function GET(request: Request) {
  const authResult = await requireAdmin(request);
  if (authResult.response) return authResult.response;

  const [queue, fees] = await Promise.all([
    listSupportQueue(),
    prisma.payment.aggregate({
      where: { status: "RELEASED" },
      _sum: { platformFeeCents: true },
    }),
  ]);

  return ok({
    totals: {
      users: queue.totals.users,
      tasks: queue.totals.tasks,
      completedTasks: queue.totals.completedTasks,
      openDisputes: queue.totals.openDisputes,
      openCancellations: queue.totals.openCancellations,
      openReports: queue.totals.openReports,
      pendingVerificationAppeals: queue.totals.pendingVerificationAppeals,
      platformFeesCents: fees._sum.platformFeeCents ?? 0,
    },
    reports: queue.reports,
  });
}
