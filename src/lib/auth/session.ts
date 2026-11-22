import "server-only";

import { cache } from "react";
import type { DecodedIdToken } from "firebase-admin/auth";
import type { MarketplaceActor } from "@/lib/domain/access";
import { actorUserSelect, toMarketplaceActor } from "./actor-mapping";
import { prisma } from "@/lib/prisma";
import { getFirebaseAdminAuth } from "./firebase-admin";

export const FIREBASE_SESSION_COOKIE = "taskhive_session";
export const FIREBASE_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;

export type AuthSession = {
  user: {
    id: string;
    email: string;
    name: string;
    image: string | null;
    emailVerified: boolean;
    isAdmin: boolean;
  };
};

function readCookie(headers: Headers, name: string) {
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) return null;

  const pair = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  if (!pair) return null;

  try {
    return decodeURIComponent(pair.slice(name.length + 1));
  } catch {
    return null;
  }
}

async function resolveDomainUser(decoded: DecodedIdToken) {
  if (!decoded.email) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
      select: {
        ...actorUserSelect,
        email: true,
        image: true,
      },
    });

    if (!user) return null;

    const emailVerified = decoded.email_verified === true;
    const email = decoded.email.toLowerCase();
    if (user.emailVerified !== emailVerified || user.email !== email) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified, email },
      });
      user.emailVerified = emailVerified;
      user.email = email;
    }

    return user;
  } catch {
    if (process.env.NODE_ENV !== "production") {
      const email = decoded.email.toLowerCase();
      const name = decoded.name?.trim() || email.split("@")[0] || "TaskHive member";
      return {
        id: `user_${decoded.uid}`,
        ageAttestedAt: new Date(0),
        taskerVerification: { status: "VERIFIED" as const, appealCount: 0 },
        email,
        name,
        image: null,
        emailVerified: decoded.email_verified === true,
        isAdmin: false,
      };
    }
    return null;
  }
}

type AuthContext = { session: AuthSession; actor: MarketplaceActor };

// React.cache is scoped to a Server Component render, never shared between
// requests. Key by the cookie value so different Headers wrappers still share
// verification. Outside a render (e.g. Route Handlers), React does not memoize.
const resolveAuthContext = cache(async (sessionCookie: string): Promise<AuthContext | null> => {
  try {
    const decoded = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);
    const user = await resolveDomainUser(decoded);
    if (!user) return null;

    return {
      session: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          emailVerified: user.emailVerified,
          isAdmin: user.isAdmin,
        },
      },
      actor: toMarketplaceActor(user),
    };
  } catch {
    // Invalid, expired, revoked, or misconfigured sessions fail closed.
    return null;
  }
});

/** One verified account snapshot for both identity and authorization readers. */
export async function getAuthContext(headers: Headers): Promise<AuthContext | null> {
  const sessionCookie = readCookie(headers, FIREBASE_SESSION_COOKIE);
  return sessionCookie ? resolveAuthContext(sessionCookie) : null;
}

export async function getAuthSession(headers: Headers): Promise<AuthSession | null> {
  return (await getAuthContext(headers))?.session ?? null;
}

export async function createDomainUser(decoded: DecodedIdToken) {
  if (!decoded.email) throw new Error("Firebase account does not contain an email address.");

  const email = decoded.email.toLowerCase();
  const name = decoded.name?.trim() || email.split("@")[0] || "TaskHive member";

  try {
    return await prisma.user.upsert({
      where: { firebaseUid: decoded.uid },
      create: {
        firebaseUid: decoded.uid,
        email,
        name,
        emailVerified: decoded.email_verified === true,
      },
      update: {
        email,
        emailVerified: decoded.email_verified === true,
      },
      select: { id: true, email: true, name: true, image: true, emailVerified: true, isAdmin: true },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      return {
        id: `user_${decoded.uid}`,
        email,
        name,
        image: null,
        emailVerified: decoded.email_verified === true,
        isAdmin: false,
      };
    }
    throw error;
  }
}
