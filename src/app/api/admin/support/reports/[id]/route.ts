import { ok, problem, requireAdmin } from "@/lib/api/response";
import { supportFailureResponse } from "@/lib/support/http";
import { resolveReport } from "@/lib/support/service";
import type { ReportDecision } from "@/lib/support/rules";

const decisions: ReportDecision[] = ["dismiss", "warn", "suspend"];

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdmin(request);
  if (authResult.response) return authResult.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const decision = decisions.includes(body.decision) ? body.decision : null;

  if (!decision) return problem("Invalid report decision", 422);

  const result = await resolveReport({
    adminId: authResult.session.user.id,
    reportId: id,
    decision,
    notes: typeof body.notes === "string" ? body.notes : undefined,
  });

  if (!result.ok) return supportFailureResponse(result);
  return ok(result);
}
