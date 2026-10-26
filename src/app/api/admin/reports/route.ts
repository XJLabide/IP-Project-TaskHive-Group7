import { ok, requireAdmin } from "@/lib/api/response";
import { listReportedMessages } from "@/lib/reports/service";

export const runtime = "nodejs";

/** Admins reviewing a report may read the reported message and its task. */
export async function GET(request: Request) {
  const authResult = await requireAdmin(request);
  if (authResult.response) return authResult.response;

  return ok(await listReportedMessages());
}
