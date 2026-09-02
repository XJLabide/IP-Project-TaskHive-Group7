import { ok } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  return ok({
    id,
    name: "Maria Santos",
    verificationStatus: "verified",
    taskerRating: 4.8,
    posterRating: 4.9,
    completedTasks: 18,
    postedTasks: 12,
    skills: ["Delivery", "Cleaning", "Tutoring"],
  });
}
