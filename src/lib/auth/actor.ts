import { getAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import type { MarketplaceActor } from "@/lib/domain/access";
import { toDomainStatus } from "@/lib/verification/mapping";

/** Reads the gate-relevant parts of an account. Returns null when no account exists. */
export async function loadActorById(userId: string): Promise<MarketplaceActor | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      emailVerified: true,
      phoneVerified: true,
      ageAttestedAt: true,
      isAdmin: true,
      taskerVerification: {
        select: { status: true, appealCount: true },
      },
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    signedIn: true,
    name: user.name,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    ageAttested: user.ageAttestedAt !== null,
    verification:
      toDomainStatus[user.taskerVerification?.status ?? "NOT_STARTED"] ?? "not_started",
    appealCount: user.taskerVerification?.appealCount ?? 0,
    isAdmin: user.isAdmin,
  };
}

/** Resolves the signed-in actor for a request, or null for a guest. */
export async function loadActorFromHeaders(headers: Headers): Promise<MarketplaceActor | null> {
  const session = await getAuthSession(headers);
  if (!session?.user) return null;
  return loadActorById(session.user.id);
}
