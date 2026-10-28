import { created, problem, requireUser } from "@/lib/api/response";
import { chatFailureResponse } from "@/lib/chat/http";
import { reportChatMessage } from "@/lib/chat/service";
import { notifyAdmins } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { reportSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const reporterId = authResult.session.user.id;
  const parsed = reportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return problem("Invalid report payload", 422);

  const { messageId, taskId, reportedUserId, reason } = parsed.data;

  if (messageId) {
    const result = await reportChatMessage(reporterId, messageId, reason);
    if (!result.ok) return chatFailureResponse(result);

    return created(result.report);
  }

  const report = await prisma.report.create({
    data: {
      reporterId,
      reportedUserId: reportedUserId ?? null,
      taskId: taskId ?? null,
      reason: reason.trim(),
    },
    select: { id: true, status: true },
  });

  await notifyAdmins({
    type: "support.report_created",
    title: "A report needs review",
    body: "A user submitted a TaskHive report. Sign in to review it.",
    eventKey: `support.report:${report.id}`,
  });

  return created(report);
}
