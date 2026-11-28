import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/response";
import { verificationDecisionSchema } from "@/lib/validation";
import { decideIdentitySubmission } from "@/lib/verification/service";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  const parsed = verificationDecisionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success || (parsed.data.outcome === "denied" && !parsed.data.reason?.trim())) {
    return NextResponse.json({ error: "Choose approve or provide a reason for rejection." }, { status: 422 });
  }

  const { userId } = await context.params;
  const result = await decideIdentitySubmission(
    userId,
    parsed.data.outcome,
    parsed.data.reason?.trim() ?? "",
    auth.session.user.id,
  );
  if (!result.ok) return NextResponse.json({ error: result.reason, code: result.code }, { status: 409 });
  return NextResponse.json({ data: result.state });
}
