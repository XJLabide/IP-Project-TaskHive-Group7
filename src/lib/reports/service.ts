import { prisma } from "@/lib/prisma";

export type ReportedMessage = {
  id: string;
  reason: string;
  status: string;
  createdAt: Date;
  reporterName: string | null;
  reportedName: string | null;
  task: { id: string; title: string } | null;
  message: {
    id: string;
    body: string;
    createdAt: Date;
    senderName: string | null;
  } | null;
};

/**
 * Admin review queue for reported chat messages. Only this route (guarded by
 * requireAdmin) may read the offending message body outside the participants.
 */
export async function listReportedMessages(): Promise<ReportedMessage[]> {
  const reports = await prisma.report.findMany({
    where: { status: "OPEN" },
    select: {
      id: true,
      reason: true,
      status: true,
      createdAt: true,
      reporter: { select: { name: true } },
      reportedUser: { select: { name: true } },
      task: { select: { id: true, title: true } },
      message: {
        select: {
          id: true,
          body: true,
          createdAt: true,
          sender: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return reports.map((report) => ({
    id: report.id,
    reason: report.reason,
    status: report.status,
    createdAt: report.createdAt,
    reporterName: report.reporter?.name ?? null,
    reportedName: report.reportedUser?.name ?? null,
    task: report.task,
    message: report.message
      ? {
          id: report.message.id,
          body: report.message.body,
          createdAt: report.message.createdAt,
          senderName: report.message.sender?.name ?? null,
        }
      : null,
  }));
}
