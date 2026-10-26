"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TaskCard } from "@/components/task/task-card";
import type { DemoApplication } from "@/lib/applications/demo";
import { isLiveApplicationStatus } from "@/lib/applications/rules";
import type { TaskSummary } from "@/lib/tasks/types";

const ALL_TASKS = "All tasks";

/** Open marketplace tasks, kept on the dashboard so the workspace is not a dead end. */
export function TaskDiscovery({
  tasks,
  applications,
}: {
  tasks: TaskSummary[];
  applications: DemoApplication[];
}) {
  const [selected, setSelected] = useState(ALL_TASKS);
  const openTasks = useMemo(
    () => tasks.filter((task) => task.status === "open"),
    [tasks],
  );
  const categories = useMemo(
    () => [
      ALL_TASKS,
      ...Array.from(
        new Set(openTasks.map((task) => task.category).filter(Boolean)),
      ),
    ],
    [openTasks],
  );
  const activeCategory = categories.includes(selected) ? selected : ALL_TASKS;
  const visibleTasks =
    activeCategory === ALL_TASKS
      ? openTasks
      : openTasks.filter((task) => task.category === activeCategory);
  const countFor = (taskId: string) =>
    applications.filter(
      (application) =>
        application.taskId === taskId &&
        isLiveApplicationStatus(application.status),
    ).length;

  return (
    <section aria-labelledby="discover-title" className="mt-2 sm:mt-4">
      <nav aria-label="Task categories" className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((category) => {
          const isSelected = category === activeCategory;
          return (
            <button
              aria-pressed={isSelected}
              className={
                isSelected
                  ? "shrink-0 rounded-full bg-[#FFC800] px-4 py-2 text-sm font-semibold text-zinc-950"
                  : "shrink-0 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 hover:border-[#D19300] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-[#FFD50D]"
              }
              key={category}
              onClick={() => setSelected(category)}
              type="button"
            >
              {category}
            </button>
          );
        })}
      </nav>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#D19300] dark:text-[#FFD50D]">
            Discover
          </p>
          <h2
            className="mt-1 text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50"
            id="discover-title"
          >
            Tasks near you
          </h2>
          <p
            aria-live="polite"
            className="mt-1 text-sm text-zinc-500 dark:text-zinc-400"
          >
            Showing {visibleTasks.length} task
            {visibleTasks.length === 1 ? "" : "s"} in this browser session
          </p>
        </div>
        <Link
          className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-600 hover:text-[#D19300] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD50D] dark:text-zinc-300 dark:hover:text-[#FFD50D]"
          href="/tasks"
        >
          Browse all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {visibleTasks.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          No {activeCategory.toLowerCase()} tasks are available yet.{" "}
          <Link
            className="font-semibold text-zinc-800 underline decoration-zinc-300 underline-offset-4 hover:text-[#D19300] dark:text-zinc-200 dark:decoration-zinc-700 dark:hover:text-[#FFD50D]"
            href="/tasks"
          >
            Browse every task
          </Link>
          .
        </p>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleTasks.slice(0, 3).map((task) => (
            <TaskCard
              applicationCount={countFor(task.id)}
              key={task.id}
              task={task}
            />
          ))}
        </div>
      )}
    </section>
  );
}
