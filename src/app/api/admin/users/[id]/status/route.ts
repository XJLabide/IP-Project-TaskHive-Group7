import { ok, problem, requireAdmin } from "@/lib/api/response";
import { supportFailureResponse } from "@/lib/support/http";
import { setUserStatus } from "@/lib/support/service";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdmin(request);
  if (authResult.response) return authResult.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const status = body.status === "SUSPENDED" || body.status === "ACTIVE"
    ? body.status
    : null;

  if (!status) return problem("Invalid user status", 422);

  const result = await setUserStatus({
    adminId: authResult.session.user.id,
    userId: id,
    status,
    notes: typeof body.notes === "string" ? body.notes : undefined,
  });

  if (!result.ok) return supportFailureResponse(result);
  return ok(result);
}
