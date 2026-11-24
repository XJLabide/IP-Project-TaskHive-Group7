import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { REQUEST_ID_HEADER, RESPONSE_REQUEST_ID_HEADER } from "@/lib/request-id";

/** Stamp application requests before auth resolution. Never trust a client ID.
 * The dashboard retains its fast guest redirect; pages/APIs still verify auth.
 */
export function proxy(request: NextRequest) {
  const requestId = randomUUID();
  const headers = new Headers(request.headers);
  headers.set(REQUEST_ID_HEADER, requestId);
  const hasSessionCookie = request.cookies.has("taskhive_session");
  const hasDevPreview = process.env.NODE_ENV !== "production" && request.nextUrl.searchParams.has("as");

  const response = request.nextUrl.pathname === "/dashboard" && !hasSessionCookie && !hasDevPreview
    ? NextResponse.redirect(new URL("/login", request.url))
    : NextResponse.next({ request: { headers } });
  response.headers.set(RESPONSE_REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = {
  matcher: ["/((?!_next/|images/|favicon\\.ico$|robots\\.txt$|sitemap\\.xml$).*)"],
};
