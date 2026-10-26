import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth/session";
import { loadActorFromHeaders } from "@/lib/auth/actor";
import { prisma } from "@/lib/prisma";
import {
  can,
  type DenialCode,
  type MarketplaceAction,
  type MarketplaceActor,
} from "@/lib/domain/access";

const denialStatus: Record<DenialCode, number> = {
  sign_in_required: 401,
  profile_incomplete: 403,
  verification_required: 403,
  verification_rejected: 403,
  appeal_already_used: 409,
  appeal_not_available: 409,
  admin_required: 403,
};

export function statusForDenial(code: DenialCode): number {
  return denialStatus[code];
}

export function problemWithCode(
  message: string,
  status: number,
  code: string,
  details?: Record<string, unknown>,
) {
  return NextResponse.json({ error: message, code, ...details }, { status });
}

/**
 * Enforces one marketplace action for the signed-in actor.
 * Guests get 401; signed-in accounts that fail a gate get a coded 403/409.
 */
export async function requireCapability(request: Request, action: MarketplaceAction) {
  const actor = await loadActorFromHeaders(request.headers);
  const decision = can(actor, action);

  if (!decision.allowed) {
    return {
      actor: null,
      response: problemWithCode(
        decision.reason,
        denialStatus[decision.code],
        decision.code,
      ),
    };
  }

  return { actor: actor as MarketplaceActor, response: null };
}

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
  const session = await getAuthSession(request.headers);

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
