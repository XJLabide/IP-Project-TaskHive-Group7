import { ok, requireAdmin } from "@/lib/api/response";
import { reports, tasks } from "@/lib/sample-data";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await requireAdmin(request);
  if (authResult.response) return authResult.response;

  return ok({
    totals: {
      users: 128,
      tasks: tasks.length,
      completedTasks: 38,
      openDisputes: 5,
      platformFeesCents: 124000,
    },
    reports,
  });
}
