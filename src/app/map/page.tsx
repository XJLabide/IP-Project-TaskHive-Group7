"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PublicShell } from "@/components/layout/public-shell";
import { TaskMap, mappableTasks } from "@/components/task/task-map";
import { useMockTasks } from "@/lib/mock-task-store";
import { useViewer } from "@/components/viewer/viewer-provider";
import { shouldUseMarketplacePreview } from "@/lib/marketplace/preview";
import { PersistentTaskBrowser } from "@/components/task/persistent-task-browser";

export default function MapPage() {
  const { isPreview } = useViewer();
  return shouldUseMarketplacePreview(isPreview)
    ? <DemoMapPage />
    : <PersistentTaskBrowser initialParams={{ view: "map" }} />;
}

function DemoMapPage() {
  const { tasks, ready } = useMockTasks();
  const { viewer } = useViewer();
  const mapped = mappableTasks(tasks);
  const Shell = viewer.signedIn ? AppShell : PublicShell;

  return (
    <Shell
      title="View map"
      description="Explore open local tasks by their approximate service area."
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {!ready
            ? "Loading task locations…"
            : mapped.length
              ? `Showing ${mapped.length} open local ${mapped.length === 1 ? "task" : "tasks"} across ${new Set(mapped.map((task) => `${task.latitude.toFixed(6)},${task.longitude.toFixed(6)}`)).size} locations.`
              : "The map is centered on the Philippines."}
        </p>
        <Link className="text-sm font-semibold text-[#235FA6] underline underline-offset-4 dark:text-[#8CBFFF]" href="/tasks">
          Browse task list
        </Link>
      </div>
      <TaskMap tasks={tasks} />
    </Shell>
  );
}

