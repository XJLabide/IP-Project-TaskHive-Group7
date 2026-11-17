import { ok, requireUser } from "@/lib/api/response";
import { getDashboardData } from "@/lib/dashboard/service";

export const runtime = "nodejs";

/** Account-scoped dashboard data from persistent marketplace records. */
export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;

  return ok(await getDashboardData(auth.session.user.id));
}
