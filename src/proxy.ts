import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Fast guest redirect for the private dashboard; the page still verifies the session. */
export function proxy(request: NextRequest) {
  const hasSessionCookie = request.cookies.has("taskhive_session");
  const hasDevPreview = process.env.NODE_ENV !== "production" && request.nextUrl.searchParams.has("as");

  if (!hasSessionCookie && !hasDevPreview) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ["/dashboard"] };
