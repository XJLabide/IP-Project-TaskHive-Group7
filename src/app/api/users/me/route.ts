import { ok, problem, requireUser } from "@/lib/api/response";
import { loadActorById } from "@/lib/auth/actor";
import { can } from "@/lib/domain/access";
import { profileUpdateSchema } from "@/lib/validation";
import { getVerification } from "@/lib/verification/service";
import { prisma } from "@/lib/prisma";
import { viewerSnapshot } from "@/lib/viewer/presentation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const actor = await loadActorById(authResult.session.user.id);
  if (!actor) return problem("Account not found", 404);

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
    viewer: viewerSnapshot(actor),
    verification: await getVerification(actor.id),
  });
}

/** Completes basic-profile fields stored separately from Firebase Authentication. */
export async function PATCH(request: Request) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const parsed = profileUpdateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return problem("Invalid profile update", 422);

  const { name, phone, ageAttested, location } = parsed.data;
  const userId = authResult.session.user.id;

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name ? { name } : {}),
      ...(phone ? { phone } : {}),
      ...(ageAttested ? { ageAttestedAt: new Date() } : {}),
    },
  });

  if (location) {
    await prisma.profile.upsert({
      where: { userId },
      update: {
        locationLabel: location.label,
        latitude: location.latitude,
        longitude: location.longitude,
      },
      create: {
        userId,
        locationLabel: location.label,
        latitude: location.latitude,
        longitude: location.longitude,
      },
    });
  }

  const actor = await loadActorById(userId);
  if (!actor) return problem("Account not found", 404);

  return ok({
    viewer: viewerSnapshot(actor),
    verification: await getVerification(userId),
  });
}
