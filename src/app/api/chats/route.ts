import { ok, requireUser } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  return ok([
    {
      id: "chat_groceries",
      taskId: "task_groceries",
      title: "Pick up groceries",
      participants: [authResult.session.user.id, "tasker_demo"],
      lastMessage: "I can deliver before 5 PM.",
    },
  ]);
}
