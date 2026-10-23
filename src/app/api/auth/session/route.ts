import { NextResponse } from "next/server";
import { getFirebaseAdminAuth } from "@/lib/auth/firebase-admin";
import {
  createDomainUser,
  FIREBASE_SESSION_COOKIE,
  FIREBASE_SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/session";
import { isAllowedSessionOrigin } from "@/lib/auth/session-origin";

export const runtime = "nodejs";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function POST(request: Request) {
  if (!isAllowedSessionOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const idToken =
    typeof body === "object" && body !== null && "idToken" in body && typeof body.idToken === "string"
      ? body.idToken
      : "";
  if (!idToken || idToken.length > 12_000) {
    return NextResponse.json({ error: "A valid Firebase ID token is required." }, { status: 400 });
  }

  try {
    const adminAuth = getFirebaseAdminAuth();
    const decoded = await adminAuth.verifyIdToken(idToken, true);
    if (!decoded.email) {
      return NextResponse.json({ error: "This sign-in method must provide an email address." }, { status: 400 });
    }

    const user = await createDomainUser(decoded);
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: FIREBASE_SESSION_MAX_AGE_SECONDS * 1000,
    });

    const response = NextResponse.json({
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
        },
      },
    });
    response.cookies.set(FIREBASE_SESSION_COOKIE, sessionCookie, {
      ...cookieOptions,
      maxAge: FIREBASE_SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : null;
    if (code === "auth/id-token-expired" || code === "auth/argument-error" || code === "auth/invalid-id-token") {
      return NextResponse.json({ error: "Your sign-in expired. Please sign in again." }, { status: 401 });
    }
    if (code === "P2002") {
      return NextResponse.json({ error: "An account with this email is already linked." }, { status: 409 });
    }

    return NextResponse.json({ error: "Authentication is temporarily unavailable." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!isAllowedSessionOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const response = NextResponse.json({ data: { signedOut: true } });
  response.cookies.set(FIREBASE_SESSION_COOKIE, "", {
    ...cookieOptions,
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}
