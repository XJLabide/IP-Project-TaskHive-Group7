import { MapPin, Search, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { TaskCard } from "@/components/task/task-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { tasks } from "@/lib/sample-data";

const filters = ["All", "Open", "Bidding", "Fixed price", "Within 3 km"];
const selectClass = "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-[#D19300] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-[#FFD50D]";

export default function TasksPage() {
  return <AppShell title="Browse Tasks" description="Find nearby errands by category, budget, status, and distance.">
    <Card><CardContent className="p-4 sm:p-5"><div className="flex flex-col gap-3 lg:flex-row"><div className="flex h-12 flex-1 items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900"><Search className="h-5 w-5" /><span className="text-sm">Search tasks, locations, categories</span></div><div className="flex gap-2 overflow-x-auto pb-1">{filters.map((filter, index) => <Button key={filter} size="sm" type="button" variant={index === 0 ? "default" : "outline"} className="shrink-0">{filter}</Button>)}</div></div></CardContent></Card>
    <div className="mt-6 grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)_280px]">
      <aside className="h-fit rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(24,24,27,0.04)] dark:border-zinc-800 dark:bg-zinc-900"><div className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-[#D19300] dark:text-[#FFD50D]" /><h2 className="font-bold">Refine results</h2></div><div className="mt-5 grid gap-4"><label className="grid gap-2 text-sm font-semibold">Category<select className={selectClass}><option>All categories</option><option>Delivery</option><option>Cleaning</option><option>Tutoring</option><option>Repairs</option></select></label><label className="grid gap-2 text-sm font-semibold">Budget<select className={selectClass}><option>Any budget</option><option>Under PHP 500</option><option>PHP 500 to 1,000</option><option>PHP 1,000+</option></select></label><label className="grid gap-2 text-sm font-semibold">Distance<select className={selectClass}><option>Within 3 km</option><option>Within 5 km</option><option>Within 10 km</option></select></label><Button variant="ghost" type="button">Reset filters</Button></div></aside>
      <section><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#D19300] dark:text-[#FFD50D]">Local opportunities</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Available tasks</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Showing {tasks.length} nearby tasks</p></div><Badge className="mb-1">Updated now</Badge></div><div className="mt-5 grid gap-4">{tasks.map((task) => <TaskCard key={task.id} task={task} />)}</div></section>
      <aside className="hidden h-fit xl:block"><Card><CardContent className="p-5"><p className="text-sm font-bold">Browse by location</p><div className="mt-4 grid min-h-72 place-items-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-800/40"><div><span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#FFD50D]/30 text-[#D19300] dark:bg-[#FFC800]/15 dark:text-[#FFD50D]"><MapPin className="h-5 w-5" /></span><p className="mt-4 text-sm font-semibold">Mapbox task map</p><p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">Task pins appear here and filter the list by selected area.</p></div></div></CardContent></Card></aside>
    </div>
  </AppShell>;
}
