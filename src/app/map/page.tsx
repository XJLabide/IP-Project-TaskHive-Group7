import { TaskBrowser } from "@/components/task/task-browser";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialParams = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] ?? "" : value ?? ""]),
  );

  return <TaskBrowser key={JSON.stringify(initialParams)} initialParams={{ ...initialParams, view: "map" }} />;
}
