import Link from "next/link";
import { ArrowRight, Clock, Globe2, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Task } from "@/lib/mock-task-store";
import { formatBrowseDistance } from "@/lib/tasks/browse";
import { formatTaskDeadline, taskStatusClass, taskStatusLabel } from "@/lib/tasks/ui";

export function TaskCard({
  task,
  distanceKm,
}: {
  task: Task;
  /** Computed from the chosen search origin; omit for workspace cards. */
  distanceKm?: number | null;
}) {
  const distanceLabel =
    distanceKm === undefined ? null : formatBrowseDistance(distanceKm);

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(24,24,27,0.04)] transition-colors hover:border-[#D19300] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-[#FFD50D] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge className="border-[#FFC800]/40 bg-[#FFD50D]/25 text-zinc-800 dark:bg-[#FFC800]/15 dark:text-zinc-100">
            {task.category || "Uncategorised"}
          </Badge>
          <Badge>{task.fulfillmentMode === "local" ? "Local" : "Remote"}</Badge>
          <Badge>{task.hiringMode === "bidding" ? "Bidding" : "Fixed price"}</Badge>
        </div>
        <Badge className={taskStatusClass(task.status)}>{taskStatusLabel(task.status)}</Badge>
      </div>

      <Link
        className="mt-4 block w-fit text-lg font-bold tracking-tight hover:text-[#D19300] dark:hover:text-[#FFD50D]"
        href={`/tasks/${task.id}`}
      >
        {task.title || "Untitled draft"}
      </Link>
      <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        {task.description || "No description yet."}
      </p>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          {task.fulfillmentMode === "local" ? (
            <MapPin className="h-4 w-4 shrink-0 text-[#D19300] dark:text-[#FFD50D]" />
          ) : (
            <Globe2 className="h-4 w-4 shrink-0 text-[#D19300] dark:text-[#FFD50D]" />
          )}
          {task.fulfillmentMode === "local"
            ? `Approx. ${task.location ?? "service area not set"}${distanceLabel ? ` · ${distanceLabel}` : ""}`
            : "Completed online · no location needed"}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 shrink-0 text-[#D19300] dark:text-[#FFD50D]" />
          {task.deadline ? formatTaskDeadline(task.deadline) : "No deadline yet"}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="h-4 w-4 shrink-0 text-[#D19300] dark:text-[#FFD50D]" />
          {task.applications} {task.applications === 1 ? "application" : "applications"}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <div className="min-w-0">
          <p className="text-xs text-zinc-400">Posted by</p>
          <p className="truncate text-sm font-semibold">{task.poster}</p>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-zinc-400">
              {task.hiringMode === "bidding" ? "Budget" : "Price"}
            </p>
            <p className="text-base font-bold">
              {task.budget > 0 ? `PHP ${task.budget.toFixed(2)}` : "Not set"}
            </p>
          </div>
          <Button asChild size="sm">
            <Link href={`/tasks/${task.id}`}>
              {task.status === "draft" ? "Open draft" : "View task"}{" "}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
