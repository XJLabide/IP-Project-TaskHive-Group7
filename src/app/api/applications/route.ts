import { ok, requireUser } from "@/lib/api/response";
import { listApplicationsForTasker } from "@/lib/applications/service";

export const runtime = "nodejs";

/** The signed-in Tasker's applications across every task. */
export async function GET(request: Request) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  return ok(await listApplicationsForTasker(authResult.session.user.id));
}
