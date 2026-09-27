"use client";

import { useState } from "react";
import { useMockTasks } from "@/lib/mock-task-store";
import Link from "next/link";
import { ArrowRight, ClipboardList, Search } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { TaskCard } from "@/components/task/task-card";
import { Button } from "@/components/ui/button";

const categories = ["All tasks", "Delivery", "Cleaning", "Tutoring"];

export default function DashboardPage() {
  const { tasks, ready } = useMockTasks();
  const [selectedCategory, setSelectedCategory] = useState("All tasks");
  const visibleTasks = selectedCategory === "All tasks"
    ? tasks
    : tasks.filter((task) => task.category === selectedCategory);

  return <AppShell title="Dashboard" description="Tasks and local work in your area.">
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 px-6 py-8 sm:px-9 sm:py-10 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">Good afternoon, Ana</p>
      <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end"><div><h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Find trusted help nearby, or earn from the skills you already have.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">Search local errands, browse new opportunities, and keep your tasks moving in one place.</p></div><Button asChild className="shrink-0"><Link href="/tasks/new"><ClipboardList className="h-4 w-4" />Post a task</Link></Button></div>
      <form action="/tasks" className="mt-7 flex max-w-3xl items-center gap-3 rounded-xl bg-white p-2 text-zinc-950 dark:border dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"><Search className="ml-2 h-5 w-5 shrink-0 text-zinc-400" /><input aria-label="Search nearby tasks" className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400" name="search" placeholder="Search tasks, categories, or locations" /><button aria-label="Search" className="grid h-10 w-10 place-items-center rounded-lg bg-[#FFC800] text-zinc-950 hover:bg-[#D19300]" type="submit"><ArrowRight className="h-4 w-4" /></button></form>
    </section>
    <nav aria-label="Task categories" className="mt-6 flex gap-2 overflow-x-auto pb-1">{categories.map((category) => {
      const selected = selectedCategory === category;
      return <button aria-pressed={selected} className={selected ? "shrink-0 rounded-full bg-[#FFC800] px-4 py-2 text-sm font-semibold text-zinc-950" : "shrink-0 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 hover:border-[#D19300] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"} key={category} onClick={() => setSelectedCategory(category)} type="button">{category}</button>;
    })}</nav>
    <section className="mt-10"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#D19300] dark:text-[#FFD50D]">Discover</p><h2 className="mt-1 text-2xl font-bold tracking-tight">Tasks near you</h2><p aria-live="polite" className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{ready ? `Showing ${visibleTasks.length} tasks in this browser session` : "Loading tasks…"}</p></div><Link className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-600 hover:text-[#D19300] dark:text-zinc-300 dark:hover:text-[#FFD50D]" href="/tasks">Browse all <ArrowRight className="h-4 w-4" /></Link></div><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{ready && visibleTasks.slice(0, 3).map((task) => <TaskCard key={task.id} task={task} />)}</div>{ready && visibleTasks.length === 0 && <p className="mt-5 text-sm text-zinc-500 dark:text-zinc-400">No {selectedCategory.toLowerCase()} tasks are available yet.</p>}</section>
  </AppShell>;
}
