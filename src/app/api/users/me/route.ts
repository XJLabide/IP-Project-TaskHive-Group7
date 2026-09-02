import { ok, requireUser } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  return ok({
    ...authResult.session.user,
    profile: {
      isPosterEnabled: true,
      isTaskerEnabled: true,
      verificationStatus: "pending",
    },
  });
}

export async function PATCH(request: Request) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const body = await request.json().catch(() => ({}));

  return ok({
    userId: authResult.session.user.id,
    profile: body,
    status: "updated_demo",
  });
}
