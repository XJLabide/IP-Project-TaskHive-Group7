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
import { DEFAULT_BROWSE_RADIUS_KM, browsePublicTasks } from "@/lib/tasks/browse";
import { resolveSearchArea, type Coordinates } from "@/lib/tasks/location";
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
  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const openTasks = useMemo(
    () => tasks.filter((task) => task.status === "open"),
    [tasks],
  );
  const activeCategory = categoryFilters.some((item) => item.label === selected)
    ? selected
    : ALL_TASKS;
  const searchArea = useMemo(
    () =>
      resolveSearchArea({
        chosen: origin
          ? { ...origin, radiusKm: DEFAULT_BROWSE_RADIUS_KM }
          : null,
      }),
    [origin],
  );
  const visibleTasks = useMemo(
    () =>
      browsePublicTasks(
        openTasks,
        {
          search: "",
          category: activeCategory,
          budget: "any",
          deadline: "any",
          quick: "all",
          sort: "recommended",
        },
        searchArea,
      ).tasks,
    [activeCategory, openTasks, searchArea],
  );
  const countFor = (taskId: string) =>
    applications.filter(
      (application) =>
        application.taskId === taskId &&
        isLiveApplicationStatus(application.status),
    ).length;

  function handleLocationClick() {
    if (origin) {
      setOrigin(null);
      setLocationError("");
      return;
    }

    if (!navigator.geolocation) {
      setLocationError(
        "Location access is unavailable in this browser. You can keep browsing nationwide.",
      );
      return;
    }

    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setOrigin({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        setLocating(false);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError(
            "Location access is blocked. Allow it in your browser settings, then try again. You can keep browsing nationwide.",
          );
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError(
            "Your location could not be determined. Check device Location Services or keep browsing nationwide.",
          );
        } else {
          setLocationError(
            "The location request timed out. Try again or keep browsing nationwide.",
          );
        }
        setLocating(false);
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 30_000 },
    );
  }

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
          <button
            aria-label={
              origin
                ? "Turn off nearby task search"
                : "Use your location to find nearby tasks"
            }
            aria-pressed={Boolean(origin)}
            className={
              origin
                ? "inline-flex h-10 items-center gap-2 rounded-full bg-[#FFC800] px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-[#D19300] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD50D] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
                : "inline-flex h-10 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:border-[#D19300] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD50D] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-[#FFD50D]"
            }
            disabled={locating}
            onClick={handleLocationClick}
            type="button"
          >
            <MapPin aria-hidden="true" className="h-4 w-4" />
            {locating
              ? "Finding location…"
              : origin
                ? `Near me · ${DEFAULT_BROWSE_RADIUS_KM} km`
                : "Use my location"}
          </button>
          <Link
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#235FA6] hover:text-[#17477F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD50D] dark:text-[#8CBFFF] dark:hover:text-white"
            href="/tasks"
          >
            Browse all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {origin ? (
        <p aria-live="polite" className="-mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          Showing local tasks within {DEFAULT_BROWSE_RADIUS_KM} km. Remote tasks remain included.
        </p>
      ) : null}
      {locationError ? (
        <p aria-live="assertive" className="-mt-4 text-sm text-[#a01a26] dark:text-[#F04452]" role="alert">
          {locationError}
        </p>
      ) : null}

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
          {visibleTasks.slice(0, 3).map(({ task, distanceKm }) => (
            <TaskCard
              applicationCount={countFor(task.id)}
              distanceKm={distanceKm}
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
