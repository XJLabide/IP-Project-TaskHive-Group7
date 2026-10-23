import "server-only";

import type { DecodedIdToken } from "firebase-admin/auth";
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

  const user = await prisma.user.findUnique({
    where: { firebaseUid: decoded.uid },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      emailVerified: true,
      isAdmin: true,
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
}

export async function getAuthSession(headers: Headers): Promise<AuthSession | null> {
  const sessionCookie = readCookie(headers, FIREBASE_SESSION_COOKIE);
  if (!sessionCookie) return null;

  try {
    const decoded = await getFirebaseAdminAuth().verifySessionCookie(sessionCookie, true);
    const user = await resolveDomainUser(decoded);
    return user ? { user } : null;
  } catch {
    // Invalid, expired, revoked, or misconfigured sessions fail closed.
    return null;
  }
}

export async function createDomainUser(decoded: DecodedIdToken) {
  if (!decoded.email) throw new Error("Firebase account does not contain an email address.");

  const email = decoded.email.toLowerCase();
  const name = decoded.name?.trim() || email.split("@")[0] || "TaskHive member";

  return prisma.user.upsert({
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
}
