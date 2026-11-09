import { TaskBrowser } from "@/components/task/task-browser";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const value = (key: string) => {
    const item = params[key];
    return Array.isArray(item) ? item[0] : item;
  };

  return <TaskBrowser key={JSON.stringify(params)} initialParams={Object.fromEntries(Object.keys(params).map((key) => [key, value(key) ?? ""]))} />;
}
