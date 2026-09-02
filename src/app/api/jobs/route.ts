import { ok } from "@/lib/api/response";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  return ok({
    received: true,
    jobName: body.jobName ?? "unknown",
  });
}
