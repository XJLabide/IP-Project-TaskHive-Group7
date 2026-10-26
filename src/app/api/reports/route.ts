import { created, problem, requireUser } from "@/lib/api/response";
import { chatFailureResponse } from "@/lib/chat/http";
import { reportChatMessage } from "@/lib/chat/service";
import { prisma } from "@/lib/prisma";
import { publishJob } from "@/lib/queue/qstash";
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

  try {
    await publishJob("notify.report.created", {
      reportId: report.id,
      reporterId,
      reportedUserId: reportedUserId ?? null,
      taskId: taskId ?? null,
    });
  } catch {
    // The report is committed; admin delivery can retry.
  }

  return created(report);
}
