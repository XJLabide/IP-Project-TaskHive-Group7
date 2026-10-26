import { ok, requireUser } from "@/lib/api/response";
import { applicationFailureResponse } from "@/lib/applications/http";
import { withdrawApplication } from "@/lib/applications/service";

export const runtime = "nodejs";

/** Withdraws a submitted bid or request. The record stays for history. */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const { id } = await context.params;
  const result = await withdrawApplication(authResult.session.user.id, id);
  if (!result.ok) return applicationFailureResponse(result);

  return ok({ id, status: result.status });
}
