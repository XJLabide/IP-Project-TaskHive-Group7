import Link from "next/link";
import { ArrowUpRight, Clock, MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type TaskCardProps = { task: { id: string; title: string; category: string; mode: string; status: string; budget: number; distance: string; deadline: string } };

export function TaskCard({ task }: TaskCardProps) {
  return (
    <Link href={`/tasks/${task.id}`} className="group block rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(24,24,27,0.04)] transition-all hover:-translate-y-0.5 hover:border-[#D19300] hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-[#FFD50D]">
      <div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge className="border-[#FFC800]/40 bg-[#FFD50D]/25 text-zinc-800 dark:bg-[#FFC800]/15 dark:text-zinc-100">{task.category}</Badge><span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{task.mode}</span></div><h3 className="mt-3 text-lg font-bold tracking-tight group-hover:text-[#D19300] dark:group-hover:text-[#FFD50D]">{task.title}</h3></div><ArrowUpRight className="h-5 w-5 shrink-0 text-zinc-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#D19300] dark:group-hover:text-[#FFD50D]" /></div>
      <div className="mt-5 grid gap-2 border-y border-zinc-100 py-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400 sm:grid-cols-2"><span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#D19300] dark:text-[#FFD50D]" />{task.distance}</span><span className="flex items-center gap-2"><Clock className="h-4 w-4 text-[#D19300] dark:text-[#FFD50D]" />{task.deadline}</span></div>
      <div className="mt-4 flex items-end justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Poster rating</p><p className="mt-1 flex items-center gap-1 text-sm font-semibold"><Star className="h-4 w-4 fill-[#FFC800] text-[#FFC800]" />4.9</p></div><div className="text-right"><p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Budget</p><p className="mt-1 text-lg font-bold">PHP {task.budget}</p></div></div>
    </Link>
  );
}
