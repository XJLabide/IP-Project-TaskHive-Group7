import { ok, problem, requireAdmin } from "@/lib/api/response";
import {
  getScheduleStatus,
  scheduleConfigSnapshot,
  upsertSchedules,
} from "@/lib/queue/schedules";
import { computeJobBacklog } from "@/lib/queue/monitor";

export const runtime = "nodejs";

/** Admin-only schedule health and per-job backlog, for monitoring. */
export async function GET(request: Request) {
  const authResult = await requireAdmin(request);
  if (authResult.response) return authResult.response;

  const [scheduleState, backlog] = await Promise.all([
    getScheduleStatus(),
    computeJobBacklog(),
  ]);

  return ok({
    config: scheduleConfigSnapshot(),
    schedules: scheduleState.jobs,
    listError: scheduleState.listError,
    backlog,
  });
}

/** Provisions (or reconciles) the declared QStash schedules. */
export async function POST(request: Request) {
  const authResult = await requireAdmin(request);
  if (authResult.response) return authResult.response;

  const result = await upsertSchedules();
  if (!result.ok) return problem(result.reason, 503);

  return ok(result);
}
