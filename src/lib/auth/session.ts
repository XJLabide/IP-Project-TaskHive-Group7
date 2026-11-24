import "server-only";

import { cache } from "react";
import type { DecodedIdToken } from "firebase-admin/auth";
import type { MarketplaceActor } from "@/lib/domain/access";
import { actorUserSelect, toMarketplaceActor } from "./actor-mapping";
import { prisma } from "@/lib/prisma";
import { getFirebaseAdminAuth } from "./firebase-admin";
import { authRequestId, createAuthDiagnostics, type AuthDiagnostics } from "./diagnostics";

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

  return pair.slice(name.length + 1);
}

async function resolveDomainUser(decoded: DecodedIdToken, diagnostics: AuthDiagnostics) {
  if (!decoded.email) {
    diagnostics.reject("identity_email_missing", "firebase_verify_session");
    return null;
  }

  try {
    const user = await diagnostics.measure("database_read_user", () => prisma.user.findUnique({
      where: { firebaseUid: decoded.uid },
      select: {
        ...actorUserSelect,
        email: true,
        image: true,
      },
    }));

    if (!user) {
      diagnostics.reject("domain_user_missing", "database_read_user");
      return null;
    }

    const emailVerified = decoded.email_verified === true;
    const email = decoded.email.toLowerCase();
    if (user.emailVerified !== emailVerified || user.email !== email) {
      await diagnostics.measure("database_sync_email", () => prisma.user.update({
        where: { id: user.id },
        data: { emailVerified, email },
      }));
      user.emailVerified = emailVerified;
      user.email = email;
    }

    return user;
  } catch {
    diagnostics.unexpectedFailure();
    if (process.env.NODE_ENV !== "production") {
      diagnostics.developmentFallback();
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
// requests. The cookie and shared request ID let different Headers wrappers share
// verification. Outside a render (e.g. Route Handlers), React does not memoize.
const resolveAuthContext = cache(async (rawCookie: string, requestId: string): Promise<AuthContext | null> => {
  const diagnostics = createAuthDiagnostics(requestId, "resolve_session");
  let outcome: "authenticated" | "denied" = "denied";
  try {
    const sessionCookie = await diagnostics.measure("session_cookie_decode", () => decodeURIComponent(rawCookie));
    const auth = await diagnostics.measure("firebase_setup", getFirebaseAdminAuth);
    const decoded = await diagnostics.measure("firebase_verify_session", () => auth.verifySessionCookie(sessionCookie, true));
    const user = await resolveDomainUser(decoded, diagnostics);
    if (!user) return null;

    const context = {
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
    outcome = "authenticated";
    return context;
  } catch {
    diagnostics.unexpectedFailure();
    // Invalid, expired, revoked, or misconfigured sessions fail closed.
    return null;
  } finally {
    diagnostics.finish(outcome);
  }
});

/** One verified account snapshot for both identity and authorization readers. */
export async function getAuthContext(headers: Headers): Promise<AuthContext | null> {
  const sessionCookie = readCookie(headers, FIREBASE_SESSION_COOKIE);
  return sessionCookie ? resolveAuthContext(sessionCookie, authRequestId(headers)) : null;
}

export async function getAuthSession(headers: Headers): Promise<AuthSession | null> {
  return (await getAuthContext(headers))?.session ?? null;
}

export async function createDomainUser(decoded: DecodedIdToken, diagnostics?: AuthDiagnostics) {
  if (!decoded.email) throw new Error("Firebase account does not contain an email address.");

  const email = decoded.email.toLowerCase();
  const name = decoded.name?.trim() || email.split("@")[0] || "TaskHive member";

  try {
    const upsert = () => prisma.user.upsert({
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
    return await (diagnostics ? diagnostics.measure("database_upsert_user", upsert) : upsert());
  } catch (error) {
    diagnostics?.unexpectedFailure();
    if (process.env.NODE_ENV !== "production") {
      diagnostics?.developmentFallback();
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
