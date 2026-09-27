import Link from "next/link";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Task } from "@/lib/mock-task-store";

export function TaskCard({ task }: { task: Task }) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(24,24,27,0.04)] transition-colors hover:border-[#D19300] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-[#FFD50D] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge className="border-[#FFC800]/40 bg-[#FFD50D]/25 text-zinc-800 dark:bg-[#FFC800]/15 dark:text-zinc-100">{task.category}</Badge>
        <Badge>{task.status}</Badge>
      </div>

      <Link className="mt-4 block w-fit text-lg font-bold tracking-tight hover:text-[#D19300] dark:hover:text-[#FFD50D]" href={`/tasks/${task.id}`}>
        {task.title}
      </Link>
      <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{task.description}</p>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 shrink-0 text-[#D19300] dark:text-[#FFD50D]" />{task.location} · {task.distance}</span>
        <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 shrink-0 text-[#D19300] dark:text-[#FFD50D]" />{task.deadline}</span>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <div className="min-w-0">
          <p className="text-xs text-zinc-400">Posted by</p>
          <p className="truncate text-sm font-semibold">{task.poster}</p>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-zinc-400">Budget</p>
            <p className="text-base font-bold">PHP {task.budget}</p>
          </div>
          <Button asChild size="sm"><Link href={`/tasks/${task.id}`}>View task <ArrowRight className="h-4 w-4" /></Link></Button>
        </div>
      </div>
    </article>
  );
}
