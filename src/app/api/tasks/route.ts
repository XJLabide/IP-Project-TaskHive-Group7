import { created, ok, problem, requireUser } from "@/lib/api/response";
import { tasks } from "@/lib/sample-data";
import { publishJob } from "@/lib/queue/qstash";
import { createTaskSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const status = searchParams.get("status");

  const filteredTasks = tasks.filter((task) => {
    return (!category || task.category === category) && (!status || task.status === status);
  });

  return ok(filteredTasks);
}

export async function POST(request: Request) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const parsed = createTaskSchema.safeParse(await request.json());
  if (!parsed.success) return problem("Invalid task payload", 422);

  await publishJob("notify.task.created", {
    title: parsed.data.title,
    userId: authResult.session.user.id,
  });

  return created({
    id: "task_created_demo",
    ...parsed.data,
    status: "OPEN",
    posterId: authResult.session.user.id,
  });
}
