import type { Prisma } from "@prisma/client";
import type { MarketplaceActor } from "@/lib/domain/access";
import { toDomainStatus } from "@/lib/verification/mapping";

export const actorUserSelect = {
  id: true,
  name: true,
  emailVerified: true,
  ageAttestedAt: true,
  isAdmin: true,
  taskerVerification: { select: { status: true, appealCount: true } },
} satisfies Prisma.UserSelect;

type ActorUser = Prisma.UserGetPayload<{ select: typeof actorUserSelect }>;

export function toMarketplaceActor(user: ActorUser): MarketplaceActor {
  return {
    id: user.id,
    signedIn: true,
    name: user.name,
    emailVerified: user.emailVerified,
    ageAttested: user.ageAttestedAt !== null,
    verification: toDomainStatus[user.taskerVerification?.status ?? "NOT_STARTED"] ?? "not_started",
    appealCount: user.taskerVerification?.appealCount ?? 0,
    isAdmin: user.isAdmin,
  };
}
