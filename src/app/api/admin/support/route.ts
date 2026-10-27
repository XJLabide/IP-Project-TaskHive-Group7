import { ok, requireAdmin } from "@/lib/api/response";
import { listSupportQueue } from "@/lib/support/service";

export const runtime = "nodejs";

/** Admin v1 queue: reports, disputes, cancellations, and verification appeals. */
export async function GET(request: Request) {
  const authResult = await requireAdmin(request);
  if (authResult.response) return authResult.response;

  return ok(await listSupportQueue());
}
