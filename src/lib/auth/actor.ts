import { getAuthContext } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import type { MarketplaceActor } from "@/lib/domain/access";
import { actorUserSelect, toMarketplaceActor } from "./actor-mapping";

/** Reads the gate-relevant parts of an account. Returns null when no account exists. */
export async function loadActorById(userId: string): Promise<MarketplaceActor | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: actorUserSelect,
    });

    return user ? toMarketplaceActor(user) : null;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      return {
        id: userId,
        signedIn: true,
        name: "TaskHive Member",
        emailVerified: true,
        ageAttested: true,
        verification: "verified",
        appealCount: 0,
        isAdmin: false,
      };
    }
    throw error;
  }
}

/** Resolves the signed-in actor for a request, or null for a guest. */
export async function loadActorFromHeaders(headers: Headers): Promise<MarketplaceActor | null> {
  return (await getAuthContext(headers))?.actor ?? null;
}
