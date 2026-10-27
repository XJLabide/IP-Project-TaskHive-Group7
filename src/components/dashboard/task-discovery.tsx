"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  GraduationCap,
  Languages,
  LayoutGrid,
  MapPin,
  Package,
  Palette,
  PenLine,
  ShoppingBag,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { TaskCard } from "@/components/task/task-card";
import type { DemoApplication } from "@/lib/applications/demo";
import { isLiveApplicationStatus } from "@/lib/applications/rules";
import { launchCategories } from "@/lib/tasks/policy";
import type { TaskSummary } from "@/lib/tasks/types";

const ALL_TASKS = "All tasks";
const categoryIcons: Record<string, LucideIcon> = {
  errands: ShoppingBag,
  delivery: Package,
  cleaning: Sparkles,
  repairs: Wrench,
  moving: Boxes,
  tutoring: GraduationCap,
  writing: PenLine,
  design: Palette,
  translation: Languages,
};
const categoryFilters = [
  { label: ALL_TASKS, Icon: LayoutGrid },
  ...launchCategories.map((category) => ({
    label: category.label,
    Icon: categoryIcons[category.slug] ?? LayoutGrid,
  })),
];

/** Open marketplace tasks, kept on the dashboard so the workspace is not a dead end. */
export function TaskDiscovery({
  tasks,
  applications,
  loading = false,
  error = false,
}: {
  tasks: TaskSummary[];
  applications: DemoApplication[];
  loading?: boolean;
  error?: boolean;
}) {
  const [selected, setSelected] = useState(ALL_TASKS);
  const openTasks = useMemo(
    () => tasks.filter((task) => task.status === "open"),
    [tasks],
  );
  const activeCategory = categoryFilters.some((item) => item.label === selected)
    ? selected
    : ALL_TASKS;
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
    <section aria-labelledby="discover-title" className="grid gap-6">
      <nav aria-label="Filter open tasks by category" className="flex flex-wrap gap-1.5">
        {categoryFilters.map(({ label, Icon }) => {
          const isSelected = label === activeCategory;
          return (
            <button
              aria-pressed={isSelected}
              className={
                isSelected
                  ? "inline-flex h-10 items-center gap-1.5 rounded-full bg-[#FFC800] px-3 text-sm font-semibold text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD50D] focus-visible:ring-offset-2"
                  : "inline-flex h-10 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 hover:border-[#D19300] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD50D] focus-visible:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-[#FFD50D]"
              }
              key={label}
              onClick={() => setSelected(label)}
              type="button"
            >
              <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={1.8} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2
            className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl"
            id="discover-title"
          >
            Open tasks
          </h2>
          <p
            aria-live="polite"
            className="mt-1 text-sm text-zinc-600 dark:text-zinc-400"
          >
            {loading
              ? "Finding available tasks…"
              : error
                ? "Task listings could not be loaded."
                : `Showing ${visibleTasks.length} open ${visibleTasks.length === 1 ? "task" : "tasks"}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            <MapPin aria-hidden="true" className="h-4 w-4" />
            Anywhere in the Philippines
          </span>
          <Link
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#235FA6] hover:text-[#17477F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD50D] dark:text-[#8CBFFF] dark:hover:text-white"
            href="/tasks"
          >
            Browse all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {loading ? (
        <div aria-busy="true" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="status">
          <span className="sr-only">Loading open tasks…</span>
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              aria-hidden="true"
              className="h-80 animate-pulse rounded-2xl border border-zinc-200 bg-white motion-reduce:animate-none dark:border-zinc-800 dark:bg-zinc-900"
              key={index}
            />
          ))}
        </div>
      ) : error ? (
        <p className="rounded-2xl border border-[#F04452]/30 bg-[#F04452]/5 p-5 text-sm text-zinc-700 dark:text-zinc-300">
          Open tasks are unavailable right now. Try again from{" "}
          <Link className="font-semibold underline underline-offset-4" href="/tasks">
            Browse tasks
          </Link>
          .
        </p>
      ) : visibleTasks.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          No {activeCategory.toLowerCase()} tasks are available yet. Browse{" "}
          <Link className="font-semibold underline underline-offset-4" href="/tasks">
            all tasks
          </Link>{" "}
          to change your search.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleTasks.slice(0, 3).map((task) => (
            <TaskCard
              applicationCount={countFor(task.id)}
              key={task.id}
              task={task}
              variant="dashboard"
            />
          ))}
        </div>
      )}
    </section>
  );
}
