"use client";

import Link from "next/link";
import { Map } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PublicShell } from "@/components/layout/public-shell";
import { TaskMap, mappableTasks } from "@/components/task/task-map";
import { useMockTasks } from "@/lib/mock-task-store";
import { useViewer } from "@/components/viewer/viewer-provider";

export default function MapPage() {
  const { tasks, ready } = useMockTasks();
  const { viewer } = useViewer();
  const mapped = mappableTasks(tasks);
  const Shell = viewer.signedIn ? AppShell : PublicShell;

  return (
    <Shell
      title="View map"
      description="Explore open local tasks by their approximate service area."
    >
      {!ready ? (
        <div className="grid min-h-48 place-items-center rounded-2xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          Loading task locations…
        </div>
      ) : mapped.length ? (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              Showing {mapped.length} open local {mapped.length === 1 ? "task" : "tasks"} across {new Set(mapped.map((task) => `${task.latitude.toFixed(6)},${task.longitude.toFixed(6)}`)).size} locations.
            </p>
            <Link className="text-sm font-semibold text-[#235FA6] underline underline-offset-4 dark:text-[#8CBFFF]" href="/tasks">
              Browse task list
            </Link>
          </div>
          <TaskMap tasks={tasks} />
        </>
      ) : (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <div>
            <Map className="mx-auto h-8 w-8 text-zinc-400" />
            <h2 className="mt-3 text-lg font-bold">No mapped tasks yet</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">Open local tasks with an approximate service area will appear here.</p>
            <Link className="mt-4 inline-block text-sm font-semibold text-[#235FA6] underline underline-offset-4 dark:text-[#8CBFFF]" href="/tasks">Browse all tasks</Link>
          </div>
        </div>
      )}
    </Shell>
  );
}

