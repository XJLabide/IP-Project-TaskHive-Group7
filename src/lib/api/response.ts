import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function created<T>(data: T) {
  return ok(data, { status: 201 });
}

export function problem(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireUser(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return { session: null, response: problem("Authentication required", 401) };
  }

  return { session, response: null };
}

export async function requireAdmin(request: Request) {
  const authResult = await requireUser(request);

  if (authResult.response) {
    return authResult;
  }

  const adminUser = await prisma.user.findUnique({
    where: { id: authResult.session.user.id },
    select: { isAdmin: true },
  });

  if (!adminUser?.isAdmin) {
    return { session: authResult.session, response: problem("Admin access required", 403) };
  }

  return authResult;
}
