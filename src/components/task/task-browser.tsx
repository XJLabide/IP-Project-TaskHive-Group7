"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Search, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { TaskCard } from "@/components/task/task-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMockTasks } from "@/lib/mock-task-store";

const quickFilters = ["All", "Open", "Bidding", "Fixed price", "Within 3 km"] as const;
type QuickFilter = (typeof quickFilters)[number];
type SortOrder = "recommended" | "nearest" | "budget-asc" | "budget-desc";
const selectClass = "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-[#D19300] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-[#FFD50D]";

export function TaskBrowser({ initialSearch, initialCategory }: { initialSearch: string; initialCategory: string }) {
  const router = useRouter();
  const { tasks, ready } = useMockTasks();
  const [search, setSearch] = useState(initialSearch);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("All");
  const [category, setCategory] = useState(initialCategory || "All categories");
  const [budget, setBudget] = useState("Any budget");
  const [distance, setDistance] = useState("Any distance");
  const [sortOrder, setSortOrder] = useState<SortOrder>("recommended");

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matches = tasks.filter((task) => {
      const taskDistance = Number.parseFloat(task.distance);
      const matchesSearch = !query || [task.title, task.description, task.category, task.location]
        .some((value) => value.toLowerCase().includes(query));
      const matchesQuick = quickFilter === "All" ||
        (quickFilter === "Open" && task.status === "Open") ||
        (quickFilter === "Bidding" && task.mode.toLowerCase().includes("bidding")) ||
        (quickFilter === "Fixed price" && task.mode.toLowerCase().includes("fixed price")) ||
        (quickFilter === "Within 3 km" && Number.isFinite(taskDistance) && taskDistance <= 3);
      const matchesCategory = category === "All categories" || category === "All tasks" || task.category === category;
      const matchesBudget = budget === "Any budget" ||
        (budget === "Under PHP 500" && task.budget < 500) ||
        (budget === "PHP 500 to 1,000" && task.budget >= 500 && task.budget <= 1000) ||
        (budget === "PHP 1,000+" && task.budget > 1000);
      const matchesDistance = distance === "Any distance" ||
        (distance === "Within 3 km" && Number.isFinite(taskDistance) && taskDistance <= 3) ||
        (distance === "Within 5 km" && Number.isFinite(taskDistance) && taskDistance <= 5) ||
        (distance === "Within 10 km" && Number.isFinite(taskDistance) && taskDistance <= 10);

      return matchesSearch && matchesQuick && matchesCategory && matchesBudget && matchesDistance;
    });
    if (sortOrder === "nearest") {
      return matches.sort((a, b) => {
        const distanceA = Number.parseFloat(a.distance);
        const distanceB = Number.parseFloat(b.distance);
        return (Number.isFinite(distanceA) ? distanceA : Infinity) - (Number.isFinite(distanceB) ? distanceB : Infinity);
      });
    }
    if (sortOrder === "budget-asc") return matches.sort((a, b) => a.budget - b.budget);
    if (sortOrder === "budget-desc") return matches.sort((a, b) => b.budget - a.budget);
    return matches;
  }, [budget, category, distance, quickFilter, search, sortOrder, tasks]);

  const activeFilterCount = [
    search.trim().length > 0,
    quickFilter !== "All",
    category !== "All categories" && category !== "All tasks",
    budget !== "Any budget",
    distance !== "Any distance",
  ].filter(Boolean).length;

  function resetFilters() {
    setSearch("");
    setQuickFilter("All");
    setCategory("All categories");
    setBudget("Any budget");
    setDistance("Any distance");
    if (initialSearch || initialCategory) router.replace("/tasks");
  }

  const allCategories = [...new Set([initialCategory, ...tasks.map((task) => task.category)].filter(Boolean))].sort();

  return (
    <AppShell title="Browse Tasks" description="Find nearby errands by category, budget, status, and distance.">
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <form action="/tasks" className="flex h-12 flex-1 items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
              <label className="flex min-w-0 flex-1 items-center gap-3">
                <Search aria-hidden="true" className="h-5 w-5 shrink-0" />
                <input
                  aria-label="Search tasks, locations, or categories"
                  className="h-full min-w-0 flex-1 bg-transparent text-sm text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
                  onChange={(event) => setSearch(event.target.value)}
                  name="search"
                  placeholder="Search tasks, locations, categories"
                  type="search"
                  value={search}
                />
              </label>
              <button aria-label="Search" className="sr-only" type="submit">Search</button>
            </form>
            <div aria-label="Quick task filters" className="flex gap-2 overflow-x-auto pb-1">
              {quickFilters.map((filter) => (
                <Button
                  aria-pressed={quickFilter === filter}
                  className="shrink-0"
                  key={filter}
                  onClick={() => setQuickFilter(filter)}
                  size="sm"
                  type="button"
                  variant={quickFilter === filter ? "default" : "outline"}
                >{filter}</Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)_280px]">
        <aside className="h-fit rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(24,24,27,0.04)] dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-[#D19300] dark:text-[#FFD50D]" /><h2 className="font-bold">Refine results</h2></div>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold">Category
              <select className={selectClass} onChange={(event) => setCategory(event.target.value)} value={category}>
                <option>All categories</option>
                {allCategories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold">Budget
              <select className={selectClass} onChange={(event) => setBudget(event.target.value)} value={budget}>
                <option>Any budget</option><option>Under PHP 500</option><option>PHP 500 to 1,000</option><option>PHP 1,000+</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold">Distance
              <select className={selectClass} onChange={(event) => setDistance(event.target.value)} value={distance}>
                <option>Any distance</option><option>Within 3 km</option><option>Within 5 km</option><option>Within 10 km</option>
              </select>
            </label>
            <Button onClick={resetFilters} type="button" variant="ghost">Clear filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}</Button>
          </div>
        </aside>

        <section>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#D19300] dark:text-[#FFD50D]">Local opportunities</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">Available tasks</h2>
              <p aria-live="polite" className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{ready ? `Showing ${filteredTasks.length} of ${tasks.length} tasks` : "Loading this browser session’s tasks…"}</p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="grid gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Sort by
                <select aria-label="Sort tasks" className={`${selectClass} min-w-40`} onChange={(event) => setSortOrder(event.target.value as SortOrder)} value={sortOrder}>
                  <option value="recommended">Recommended</option>
                  <option value="nearest">Nearest first</option>
                  <option value="budget-asc">Lowest budget</option>
                  <option value="budget-desc">Highest budget</option>
                </select>
              </label>
              <Button asChild className="shrink-0" size="sm"><Link href="/tasks/new">Create task</Link></Button>
            </div>
          </div>
          <div className="mt-5 grid gap-4">
            {!ready ? null : filteredTasks.length ? filteredTasks.map((task) => <TaskCard key={task.id} task={task} />) : (
              <Card><CardContent className="grid min-h-48 place-items-center p-6 text-center">
                <div><p className="font-semibold">No tasks match these filters.</p><p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Try a different search or reset the filters.</p><Button className="mt-4" onClick={resetFilters} type="button" variant="outline">Reset filters</Button></div>
              </CardContent></Card>
            )}
          </div>
        </section>

        <aside className="hidden h-fit xl:block"><Card><CardContent className="p-5">
          <p className="text-sm font-bold">Browse by location</p>
          <div className="mt-4 grid min-h-72 place-items-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-800/40">
            <div><span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#FFD50D]/30 text-[#D19300] dark:bg-[#FFC800]/15 dark:text-[#FFD50D]"><MapPin className="h-5 w-5" /></span><p className="mt-4 text-sm font-semibold">Map preview</p><p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">Backend map data is not connected. Distance filters use demo values only.</p></div>
          </div>
        </CardContent></Card></aside>
      </div>
    </AppShell>
  );
}
