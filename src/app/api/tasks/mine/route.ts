import { ok, requireUser } from "@/lib/api/response";
import { listOwnedTasks } from "@/lib/tasks/owner-service";

export const runtime = "nodejs";

/** Private task workspace: drafts, open tasks, and retained task history. */
export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;

  return ok(await listOwnedTasks(auth.session.user.id));
}
