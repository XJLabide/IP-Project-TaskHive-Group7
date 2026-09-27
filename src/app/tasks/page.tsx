import { TaskBrowser } from "@/components/task/task-browser";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string | string[]; category?: string | string[] }>;
}) {
  const params = await searchParams;
  const search = Array.isArray(params.search) ? params.search[0] : params.search;
  const category = Array.isArray(params.category) ? params.category[0] : params.category;

  return <TaskBrowser key={`${search ?? ""}:${category ?? ""}`} initialSearch={search ?? ""} initialCategory={category ?? ""} />;
}
