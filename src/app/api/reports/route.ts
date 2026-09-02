import { created, problem, requireUser } from "@/lib/api/response";
import { publishJob } from "@/lib/queue/qstash";
import { reportSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const parsed = reportSchema.safeParse(await request.json());
  if (!parsed.success) return problem("Invalid report payload", 422);

  await publishJob("notify.report.created", {
    reporterId: authResult.session.user.id,
  });

  return created({
    id: "report_created_demo",
    reporterId: authResult.session.user.id,
    status: "OPEN",
    ...parsed.data,
  });
}
