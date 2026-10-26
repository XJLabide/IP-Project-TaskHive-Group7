import { created, ok, problem, requireCapability, requireUser } from "@/lib/api/response";
import { applicationFailureResponse } from "@/lib/applications/http";
import { createBid, listApplicationsForTask } from "@/lib/applications/service";
import { bidSchema } from "@/lib/validation";

export const runtime = "nodejs";

/** Posters see every applicant; a Tasker sees only their own application. */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const { id } = await context.params;
  const result = await listApplicationsForTask({ id: authResult.session.user.id }, id);
  if (!result.ok) return applicationFailureResponse(result);

  return ok({ taskId: id, role: result.role, applications: result.applications });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireCapability(request, "apply_to_task");
  if (authResult.response) return authResult.response;

  const parsed = bidSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return problem("Invalid bid payload", 422);

  const { id } = await context.params;
  const result = await createBid(authResult.actor, id, parsed.data);
  if (!result.ok) return applicationFailureResponse(result);

  return created(result.application);
}
