import { ok, problem } from "@/lib/api/response";
import { searchLocations } from "@/lib/integrations/mapbox";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) return problem("Missing q search parameter", 400);

  return ok(await searchLocations(query));
}
