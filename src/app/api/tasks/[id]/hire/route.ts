import { created, problem, problemWithCode, requireUser, statusForDenial } from "@/lib/api/response";
import { loadActorById } from "@/lib/auth/actor";
import { can } from "@/lib/domain/access";
import { publishJob } from "@/lib/queue/qstash";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const taskerId = typeof body.taskerId === "string" ? body.taskerId : null;

  if (!taskerId) return problem("A taskerId is required to hire", 422);

  const tasker = await loadActorById(taskerId);
  if (!tasker) return problem("Tasker not found", 404);

  const decision = can(tasker, "be_assigned");
  if (!decision.allowed) {
    return problemWithCode(
      decision.reason,
      statusForDenial(decision.code),
      decision.code,
    );
  }

  await publishJob("notify.hiring.approved", {
    taskId: id,
    taskerId,
  });

  return created({
    id: "assignment_created_demo",
    taskId: id,
    posterId: authResult.session.user.id,
    taskerId,
    nextStatus: "PENDING_PAYMENT",
  });
}
