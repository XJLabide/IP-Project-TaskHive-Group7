import { created, ok, problem, requireCapability, requireUser } from "@/lib/api/response";
import { chatFailureResponse } from "@/lib/chat/http";
import { listChats, openTaskChat } from "@/lib/chat/service";
import { openChatSchema } from "@/lib/validation";

export const runtime = "nodejs";

/** Every thread the signed-in user takes part in. */
export async function GET(request: Request) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  return ok(await listChats(authResult.session.user.id));
}

/** Starts (or reuses) a task-scoped thread with the Poster. */
export async function POST(request: Request) {
  const authResult = await requireCapability(request, "chat_about_task");
  if (authResult.response) return authResult.response;

  const parsed = openChatSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return problem("Invalid chat payload", 422);

  const result = await openTaskChat(authResult.actor.id, parsed.data.taskId);
  if (!result.ok) return chatFailureResponse(result);

  return created(result.chat);
}
