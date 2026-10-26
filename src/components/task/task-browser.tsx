"use client";

import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Globe2, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PublicShell } from "@/components/layout/public-shell";
import { TaskCard } from "@/components/task/task-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMockTasks } from "@/lib/mock-task-store";
import { useMarketplace } from "@/lib/mock-marketplace-store";
import { isLiveApplicationStatus } from "@/lib/applications/rules";
import { useViewer } from "@/components/viewer/viewer-provider";
import { launchCategories } from "@/lib/tasks/policy";
import {
  DEFAULT_BROWSE_RADIUS_KM,
  browsePublicTasks,
  browseRadii,
  browseSearchArea,
  defaultOrigin,
  searchOrigins,
  type BrowseAreaMode,
  type BrowseBudget,
  type BrowseDeadline,
  type BrowseQuick,
  type BrowseSort,
} from "@/lib/tasks/browse";

const quickFilters: ReadonlyArray<{ id: BrowseQuick; label: string }> = [
  { id: "all", label: "All" },
  { id: "local", label: "Local" },
  { id: "remote", label: "Remote" },
  { id: "bidding", label: "Bidding" },
  { id: "fixed-price", label: "Fixed price" },
];

const sortOptions: ReadonlyArray<{ id: BrowseSort; label: string }> = [
  { id: "recommended", label: "Recommended" },
  { id: "nearest", label: "Nearest first" },
  { id: "budget_asc", label: "Lowest budget" },
  { id: "budget_desc", label: "Highest budget" },
  { id: "deadline", label: "Deadline soonest" },
];

const budgetOptions: ReadonlyArray<{ id: BrowseBudget; label: string }> = [
  { id: "any", label: "Any budget" },
  { id: "under-500", label: "Under PHP 500" },
  { id: "500-1000", label: "PHP 500 to 1,000" },
  { id: "over-1000", label: "PHP 1,000+" },
];

const deadlineOptions: ReadonlyArray<{ id: BrowseDeadline; label: string }> = [
  { id: "any", label: "Any deadline" },
  { id: "3-days", label: "Within 3 days" },
  { id: "7-days", label: "Within 7 days" },
  { id: "30-days", label: "Within 30 days" },
];

const ANYWHERE = "anywhere";
const selectClass =
  "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none focus:border-[#D19300] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-[#FFD50D]";

function LoadingCard() {
  return (
    <div
      aria-hidden="true"
      className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6"
    >
      <div className="flex gap-2">
        <span className="h-5 w-20 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <span className="h-5 w-16 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="mt-4 h-6 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-2 h-4 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-800/60" />
      <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800/60" />
      <div className="mt-6 h-10 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800/60" />
    </div>
  );
}

export function TaskBrowser({ initialSearch, initialCategory }: { initialSearch: string; initialCategory: string }) {
  const router = useRouter();
  const { tasks, ready, error, resetDemo } = useMockTasks();
  const { applications } = useMarketplace();
  const { viewer } = useViewer();
  // Guests keep the public site chrome; signed-in accounts get the workspace shell.
  const Shell: ComponentType<{ title: string; description: string; children: ReactNode }> =
    viewer.signedIn ? AppShell : PublicShell;

  const [search, setSearch] = useState(initialSearch);
  const [quickFilter, setQuickFilter] = useState<BrowseQuick>("all");
  const [category, setCategory] = useState(initialCategory || "All categories");
  const [budget, setBudget] = useState<BrowseBudget>("any");
  const [deadline, setDeadline] = useState<BrowseDeadline>("any");
  const [originId, setOriginId] = useState<string>(
    viewer.signedIn ? defaultOrigin.id : ANYWHERE,
  );
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_BROWSE_RADIUS_KM);
  const [sortOrder, setSortOrder] = useState<BrowseSort>("recommended");

  const publicTasks = useMemo(() => tasks.filter((task) => task.status === "open"), [tasks]);
  const managedTasks = useMemo(() => {
    const viewerName = viewer.signedIn ? (viewer.displayName ?? "You") : null;
    return tasks.filter(
      (task) =>
        task.status !== "open" &&
        viewerName !== null &&
        task.poster === viewerName,
    );
  }, [tasks, viewer.displayName, viewer.signedIn]);

  const countFor = (taskId: string) =>
    applications.filter(
      (application) =>
        application.taskId === taskId &&
        isLiveApplicationStatus(application.status),
    ).length;

  const origin = useMemo(
    () =>
      originId === ANYWHERE
        ? null
        : searchOrigins.find((item) => item.id === originId) ?? defaultOrigin,
    [originId],
  );
  const originChoices = viewer.signedIn
    ? searchOrigins
    : searchOrigins.filter((item) => item.id !== defaultOrigin.id);
  const areaMode: BrowseAreaMode =
    originId === ANYWHERE
      ? "anywhere"
      : viewer.signedIn && originId === defaultOrigin.id
        ? "saved"
        : "chosen";
  const searchArea = useMemo(
    () =>
      browseSearchArea({
        mode: areaMode,
        origin,
        saved: viewer.signedIn ? defaultOrigin : null,
        radiusKm,
      }),
    [areaMode, origin, radiusKm, viewer.signedIn],
  );

  const results = useMemo(
    () =>
      browsePublicTasks(
        publicTasks,
        { search, category, budget, deadline, quick: quickFilter, sort: sortOrder },
        searchArea,
      ),
    [budget, category, deadline, publicTasks, quickFilter, search, searchArea, sortOrder],
  );

  const activeFilterCount = [
    search.trim().length > 0,
    quickFilter !== "all",
    category !== "All categories" && category !== "All tasks",
    budget !== "any",
    deadline !== "any",
    originId !== (viewer.signedIn ? defaultOrigin.id : ANYWHERE),
    origin !== null && radiusKm !== DEFAULT_BROWSE_RADIUS_KM,
  ].filter(Boolean).length;

  function resetFilters() {
    setSearch("");
    setQuickFilter("all");
    setCategory("All categories");
    setBudget("any");
    setDeadline("any");
    setOriginId(viewer.signedIn ? defaultOrigin.id : ANYWHERE);
    setRadiusKm(DEFAULT_BROWSE_RADIUS_KM);
    setSortOrder("recommended");
    if (initialSearch || initialCategory) router.replace("/tasks");
  }

  const allCategories = [...new Set([
    initialCategory,
    ...launchCategories.map((category) => category.label),
    ...tasks.map((task) => task.category),
  ].filter(Boolean))].sort();

  return (
    <Shell title="Browse Tasks" description="Find nearby errands by category, budget, deadline, and search area.">
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
                  aria-pressed={quickFilter === filter.id}
                  className="shrink-0"
                  key={filter.id}
                  onClick={() => setQuickFilter(filter.id)}
                  size="sm"
                  type="button"
                  variant={quickFilter === filter.id ? "default" : "outline"}
                >{filter.label}</Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {!viewer.signedIn ? (
        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
          <span className="font-semibold text-zinc-950 dark:text-zinc-50">Browsing as a guest.</span>
          Sign in to apply, message a Poster, or post a task.
          <Link className="font-semibold text-[#D19300] underline underline-offset-4 dark:text-[#FFD50D]" href="/login">Sign in</Link>
        </p>
      ) : null}

      {error ? (
        <Card className="mt-4 border-[#F04452]/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="font-bold">This browser could not load the demo tasks.</p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Session storage is unavailable or full. You can reset the demo data and try again.
              </p>
            </div>
            <Button onClick={resetDemo} type="button" variant="outline">Reset demo data</Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_280px]">
        <aside className="h-fit rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(24,24,27,0.04)] dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-[#D19300] dark:text-[#FFD50D]" /><h2 className="font-bold">Refine results</h2></div>

          <fieldset className="mt-5 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <legend className="px-1 text-sm font-bold">Search area</legend>
            <div className="mt-2 grid gap-3">
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                Origin
                <select
                  aria-label="Search origin"
                  className={selectClass}
                  onChange={(event) => setOriginId(event.target.value)}
                  value={originId}
                >
                  {originChoices.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                  <option value={ANYWHERE}>Anywhere in the Philippines</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                Radius
                <select
                  aria-label="Search radius"
                  className={selectClass}
                  disabled={originId === ANYWHERE}
                  onChange={(event) => setRadiusKm(Number(event.target.value))}
                  value={radiusKm}
                >
                  {browseRadii.map((radius) => (
                    <option key={radius} value={radius}>
                      {radius} km{radius === DEFAULT_BROWSE_RADIUS_KM ? " (default)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                {originId === ANYWHERE
                  ? "Local and remote tasks are shown nationwide."
                  : `Local tasks within ${radiusKm} km of ${origin?.label ?? "your origin"}. Remote tasks need no location.`}
              </p>
            </div>
          </fieldset>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold">Category
              <select className={selectClass} onChange={(event) => setCategory(event.target.value)} value={category}>
                <option>All categories</option>
                {allCategories.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold">Budget
              <select className={selectClass} onChange={(event) => setBudget(event.target.value as BrowseBudget)} value={budget}>
                {budgetOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold">Deadline
              <select className={selectClass} onChange={(event) => setDeadline(event.target.value as BrowseDeadline)} value={deadline}>
                {deadlineOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
            <Button onClick={resetFilters} type="button" variant="ghost">Clear filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}</Button>
          </div>
        </aside>

        <section>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#D19300] dark:text-[#FFD50D]">Public opportunities</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">Available tasks</h2>
              <p aria-live="polite" className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {!ready
                  ? "Loading this browser session’s tasks…"
                  : `Showing ${results.tasks.length} of ${publicTasks.length} public tasks`}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="grid gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Sort by
                <select aria-label="Sort tasks" className={`${selectClass} min-w-44`} onChange={(event) => setSortOrder(event.target.value as BrowseSort)} value={sortOrder}>
                  {sortOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>
              <Button asChild className="shrink-0" size="sm">{viewer.canPost ? <Link href="/tasks/new">Create task</Link> : viewer.signedIn ? <Link href="/profile">Complete profile to post</Link> : <Link href="/login">Sign in to post</Link>}</Button>
            </div>
          </div>
          <div className="mt-5 grid gap-4">
            {!ready ? (
              <>
                <LoadingCard />
                <LoadingCard />
                <LoadingCard />
              </>
            ) : results.tasks.length ? (
              results.tasks.map(({ task, distanceKm }) => (
                <TaskCard
                  applicationCount={countFor(task.id)}
                  distanceKm={distanceKm}
                  key={task.id}
                  task={task}
                />
              ))
            ) : (
              <Card><CardContent className="grid min-h-48 place-items-center p-6 text-center">
                <div>
                  <p className="font-semibold">No tasks match these filters.</p>
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {origin ? `Try a wider radius than ${radiusKm} km, another origin, or fewer filters.` : "Try a different search or fewer filters."}
                  </p>
                  <Button className="mt-4" onClick={resetFilters} type="button" variant="outline">Reset filters</Button>
                </div>
              </CardContent></Card>
            )}
          </div>
        </section>

        <aside className="hidden h-fit gap-5 xl:grid"><Card><CardContent className="p-5">
          <p className="flex items-center gap-2 text-sm font-bold">
            <MapPin className="h-4 w-4 text-[#D19300] dark:text-[#FFD50D]" />
            {origin ? "Searching around" : "Searching nationwide"}
          </p>
          <p className="mt-2 text-lg font-bold">
            {origin ? origin.label : "Anywhere in the Philippines"}
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {origin ? `Within ${radiusKm} km · 10 km is the default` : "No radius applied"}
          </p>
          <div className="mt-4 grid gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-800/40">
            <p className="flex items-center justify-between gap-3">
              <span className="text-zinc-500 dark:text-zinc-400">Local shown</span>
              <span className="font-bold">{results.tasks.filter(({ task }) => task.fulfillmentMode === "local").length}</span>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span className="text-zinc-500 dark:text-zinc-400">Remote</span>
              <span className="font-bold">{results.tasks.filter(({ task }) => task.fulfillmentMode === "remote").length}</span>
            </p>
          </div>
          <p className="mt-4 flex gap-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            <Globe2 className="mt-0.5 h-4 w-4 shrink-0" />
            Remote tasks have no physical pin. Local cards show only the approximate area until payment and assignment.
          </p>
          <p className="mt-3 text-xs leading-5 text-zinc-400">
            Map preview is not connected; distances use demo coordinates.
          </p>
        </CardContent></Card></aside>
      </div>

      {ready && viewer.signedIn && managedTasks.length > 0 ? (
        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#D19300] dark:text-[#FFD50D]">Your workspace</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">Your tasks</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Drafts, payment holds, active assignments, and cancellations stay private to you.
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/tasks/new">Create task</Link>
            </Button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {managedTasks.map((task) => (
              <TaskCard applicationCount={countFor(task.id)} key={task.id} task={task} />
            ))}
          </div>
        </section>
      ) : null}
    </Shell>
  );
}
