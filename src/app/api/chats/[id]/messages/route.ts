import { created, ok, problem, requireCapability, requireUser } from "@/lib/api/response";
import { chatFailureResponse } from "@/lib/chat/http";
import { getChatMessages, postChatMessage } from "@/lib/chat/service";
import { chatMessageSchema } from "@/lib/validation";

export const runtime = "nodejs";

/** Participants can read the thread; history survives a closed task. */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const { id } = await context.params;
  const result = await getChatMessages(authResult.session.user.id, id);
  if (!result.ok) return chatFailureResponse(result);

  return ok({
    chat: result.chat,
    canPost: result.canPost,
    messages: result.messages,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireCapability(request, "chat_about_task");
  if (authResult.response) return authResult.response;

  const parsed = chatMessageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return problem("Invalid message payload", 422);

  const { id } = await context.params;
  const result = await postChatMessage(authResult.actor.id, id, parsed.data.body);
  if (!result.ok) return chatFailureResponse(result);

  return created(result.message);
}
