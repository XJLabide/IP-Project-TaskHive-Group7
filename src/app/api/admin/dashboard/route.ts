import { ok, problem, requireAdmin } from "@/lib/api/response";
import { getAdminSection, getAdminTotals } from "@/lib/support/reads";

export const runtime = "nodejs";

/** Admin overview backed by marketplace records, not sample metrics. */
export async function GET(request: Request) {
  const authResult = await requireAdmin(request);
  if (authResult.response) return authResult.response;

  try {
    const [totals, reports] = await Promise.all([getAdminTotals(true), getAdminSection("reports")]);
    return ok({ totals, reports: reports.items, pagination: reports.pagination });
  } catch { return problem("Admin overview could not load. Try again.", 503); }
}
