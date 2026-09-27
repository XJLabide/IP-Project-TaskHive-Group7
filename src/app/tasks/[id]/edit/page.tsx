import { TaskForm } from "@/components/task/task-form";

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TaskForm mode="edit" taskId={id} />;
}
