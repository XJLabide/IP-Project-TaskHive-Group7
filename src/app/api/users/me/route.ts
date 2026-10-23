import { ok, requireUser } from "@/lib/api/response";
import { loadActorById } from "@/lib/auth/actor";
import { can } from "@/lib/domain/access";
import { getVerification } from "@/lib/verification/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const actor = await loadActorById(authResult.session.user.id);
  if (!actor) return ok({ ...authResult.session.user, verification: null });

  return ok({
    ...authResult.session.user,
    profile: {
      isPosterEnabled: true,
      isTaskerEnabled: true,
    },
    gates: {
      canPost: can(actor, "post_task").allowed,
      canApply: can(actor, "apply_to_task").allowed,
      canBeAssigned: can(actor, "be_assigned").allowed,
      canAppealVerification: can(actor, "appeal_verification").allowed,
    },
    verification: await getVerification(actor.id),
  });
}

export async function PATCH(request: Request) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const body = await request.json().catch(() => ({}));

  return ok({
    userId: authResult.session.user.id,
    profile: body,
    status: "updated_demo",
  });
}
