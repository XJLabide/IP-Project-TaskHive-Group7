import { created, ok, requireUser } from "@/lib/api/response";
import { publishJob } from "@/lib/queue/qstash";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const { id } = await context.params;

  return ok({
    chatId: id,
    messages: [
      { id: "msg_1", senderId: "tasker_demo", body: "Is the grocery list final?" },
      { id: "msg_2", senderId: authResult.session.user.id, body: "Yes, it is final." },
    ],
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  await publishJob("notify.chat.message", {
    chatId: id,
    senderId: authResult.session.user.id,
  });

  return created({
    id: "msg_created_demo",
    chatId: id,
    senderId: authResult.session.user.id,
    body: body.body,
  });
}
