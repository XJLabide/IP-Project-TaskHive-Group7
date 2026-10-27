import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock, Globe2, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Task } from "@/lib/mock-task-store";
import { formatBrowseDistance } from "@/lib/tasks/browse";
import { formatTaskDeadline, taskStatusClass, taskStatusLabel } from "@/lib/tasks/ui";

const categoryPhotos: Record<string, string> = {
  errands: "https://images.unsplash.com/photo-1738716619472-34389316c715?auto=format&fit=crop&w=960&q=80",
  delivery: "https://images.unsplash.com/photo-1774560745853-bcd965d85d12?auto=format&fit=crop&w=960&q=80",
  cleaning: "https://images.unsplash.com/photo-1759846866217-e627e4478f82?auto=format&fit=crop&w=960&q=80",
  repairs: "https://images.unsplash.com/photo-1771122453274-d3270e73cf94?auto=format&fit=crop&w=960&q=80",
  moving: "https://images.unsplash.com/photo-1700165644892-3dd6b67b25bc?auto=format&fit=crop&w=960&q=80",
  tutoring: "https://images.unsplash.com/photo-1758685733926-00cba008215b?auto=format&fit=crop&w=960&q=80",
  writing: "https://images.unsplash.com/photo-1759984782211-3a02ca78e6ac?auto=format&fit=crop&w=960&q=80",
  design: "https://images.unsplash.com/photo-1500160503851-c04cefe545a9?auto=format&fit=crop&w=960&q=80",
  translation: "https://images.unsplash.com/photo-1673515335152-f2589ba8bb7a?auto=format&fit=crop&w=960&q=80",
};

function CategoryArtwork({ task }: { task: Task }) {
  const image = categoryPhotos[task.category.toLowerCase()] ?? categoryPhotos.errands;

  return (
    <div className="relative isolate h-28 overflow-hidden sm:h-32">
      <Image
        alt=""
        className="object-cover"
        fill
        sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
        src={image}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
      <div className="relative flex h-full items-start px-4 py-3 sm:px-5">
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-zinc-800 dark:bg-zinc-950/75 dark:text-zinc-100">
            {task.category || "Task"}
          </span>
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-950/75 dark:text-zinc-200">
            {task.fulfillmentMode === "local" ? "Local" : "Remote"}
          </span>
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-950/75 dark:text-zinc-200">
            {task.hiringMode === "bidding" ? "Bidding" : "Fixed price"}
          </span>
        </div>
      </div>
    </div>
  );
}

function formatBudget(pesos: number) {
  if (pesos <= 0) return "Not set";

  return `PHP ${pesos.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function TaskCard({
  task,
  distanceKm,
  applicationCount,
  variant = "standard",
}: {
  task: Task;
  /** Computed from the chosen search origin; omit for workspace cards. */
  distanceKm?: number | null;
  /** Live applications from the session store; falls back to the demo count. */
  applicationCount?: number;
  variant?: "standard" | "dashboard";
}) {
  const distanceLabel =
    distanceKm === undefined ? null : formatBrowseDistance(distanceKm);
  const applications = applicationCount ?? task.applications;
  const location =
    task.fulfillmentMode === "local"
      ? `Approx. ${task.location ?? "service area not set"}${distanceLabel ? ` · ${distanceLabel}` : ""}`
      : "Completed online · no location needed";

  return (
    <article
      className={
        variant === "dashboard"
          ? "flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-colors hover:border-[#D19300] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-[#FFD50D]"
          : "flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-5 transition-colors hover:border-[#D19300] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-[#FFD50D] sm:p-6"
      }
    >
      {variant === "dashboard" ? <CategoryArtwork task={task} /> : null}
      <div
        className={
          variant === "dashboard"
            ? "flex flex-1 flex-col p-4 sm:p-5"
            : "flex h-full flex-col"
        }
      >
        {variant === "standard" ? (
          <div className="flex items-start justify-between gap-3">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {task.category || "Uncategorised"}
              </span>
              <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">
                ·
              </span>
              <span>{task.fulfillmentMode === "local" ? "Local" : "Remote"}</span>
              <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">
                ·
              </span>
              <span>{task.hiringMode === "bidding" ? "Bidding" : "Fixed price"}</span>
            </p>
            {task.status === "open" ? null : (
              <Badge className={`${taskStatusClass(task.status)} shrink-0`}>
                {taskStatusLabel(task.status)}
              </Badge>
            )}
          </div>
        ) : null}

      <Link
        className="mt-3 block w-fit text-lg font-bold leading-snug tracking-tight hover:text-[#D19300] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD50D] focus-visible:ring-offset-4 dark:hover:text-[#FFD50D] dark:focus-visible:ring-offset-zinc-900"
        href={`/tasks/${task.id}`}
      >
        {task.title || "Untitled draft"}
      </Link>
      <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        {task.description || "No description yet."}
      </p>

      <div className="mt-auto grid gap-1.5 pt-4 text-sm text-zinc-600 dark:text-zinc-400">
        <span className="flex items-start gap-2">
          {task.fulfillmentMode === "local" ? (
            <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
          ) : (
            <Globe2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
          )}
          <span className="min-w-0">{location}</span>
        </span>
        <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span className="flex items-center gap-2">
            <Clock aria-hidden="true" className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
            {task.deadline ? formatTaskDeadline(task.deadline) : "No deadline yet"}
          </span>
          <span className="flex items-center gap-2">
            <Users aria-hidden="true" className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
            {applications} {applications === 1 ? "application" : "applications"}
          </span>
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <div className="min-w-0">
          <p className="text-xs text-zinc-600 dark:text-zinc-400">Posted by</p>
          <p className="truncate text-sm font-semibold">{task.poster}</p>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {task.hiringMode === "bidding" ? "Budget" : "Price"}
            </p>
            <p className="text-lg font-bold leading-tight tabular-nums">
              {formatBudget(task.budget)}
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={`/tasks/${task.id}`}>
              {task.status === "draft" ? "Open draft" : "View task"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
      </div>
    </article>
  );
}
