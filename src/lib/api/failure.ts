import { NextResponse } from "next/server";

/** One failure envelope for the application and chat routes. */
export function failureResponse(
  message: string,
  code: string,
  statuses: Record<string, number>,
) {
  return NextResponse.json(
    { error: message, code },
    { status: statuses[code] ?? 409 },
  );
}
