import { ok, problem } from "@/lib/api/response";
import { getPublicProfile } from "@/lib/profiles/public-profile";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const profile = await getPublicProfile(id);
    if (!profile) return problem("Profile not found", 404);
    return ok(profile, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return problem("Profile information is temporarily unavailable.", 503);
  }
}
