"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, Map, Search, SlidersHorizontal, X } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PublicShell } from "@/components/layout/public-shell";
import { TaskCard } from "@/components/task/task-card";
import { TaskMap } from "@/components/task/task-map";
import {
  LeafletLocationPicker,
  PHILIPPINES_MAP_CENTER,
} from "@/components/task/leaflet-location-picker";
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
  "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-700 outline-none transition-colors focus:border-[#D19300] focus:ring-2 focus:ring-[#FFD50D]/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-[#FFD50D]";

type BrowseView = "list" | "map";
type InitialParams = Record<string, string>;

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

export function TaskBrowser({ initialParams }: { initialParams: InitialParams }) {
  const router = useRouter();
  const { tasks, ready, error, resetDemo } = useMockTasks();
  const { applications } = useMarketplace();
  const { viewer } = useViewer();
  // Guests keep the public site chrome; signed-in accounts get the workspace shell.
  const Shell: ComponentType<{ title: string; description: string; children: ReactNode }> =
    viewer.signedIn ? AppShell : PublicShell;

  const [search, setSearch] = useState(initialParams.search ?? "");
  const [quickFilter, setQuickFilter] = useState<BrowseQuick>((initialParams.quick as BrowseQuick) || "all");
  const [category, setCategory] = useState(initialParams.category || "All categories");
  const [budget, setBudget] = useState<BrowseBudget>((initialParams.budget as BrowseBudget) || "any");
  const [deadline, setDeadline] = useState<BrowseDeadline>((initialParams.deadline as BrowseDeadline) || "any");
  const [originId, setOriginId] = useState<string>(initialParams.origin || (viewer.signedIn ? defaultOrigin.id : ANYWHERE));
  const [pinnedOrigin, setPinnedOrigin] = useState<(typeof defaultOrigin) | null>(() => {
    const latitude = Number(initialParams.lat);
    const longitude = Number(initialParams.lng);
    return Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { id: "map-pin", label: "Pinned map location", latitude, longitude }
      : null;
  });
  const [radiusKm, setRadiusKm] = useState<number>(Number(initialParams.radiusKm) || DEFAULT_BROWSE_RADIUS_KM);
  const [sortOrder, setSortOrder] = useState<BrowseSort>((initialParams.sort as BrowseSort) || "recommended");
  const [view, setView] = useState<BrowseView>(initialParams.view === "map" ? "map" : "list");
  const dialogRef = useRef<HTMLDialogElement>(null);
  function openFilters() { dialogRef.current?.showModal(); }

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
    () => {
      if (originId === ANYWHERE) return null;
      if (originId === "map-pin") return pinnedOrigin;
      return searchOrigins.find((item) => item.id === originId) ?? defaultOrigin;
    },
    [originId, pinnedOrigin],
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
    setPinnedOrigin(null);
    setRadiusKm(DEFAULT_BROWSE_RADIUS_KM);
    setSortOrder("recommended");
    router.replace("/tasks");
  }

  useEffect(() => {
    const query = new URLSearchParams();
    const values: Record<string, string> = { search, quick: quickFilter, category, budget, deadline, origin: originId, radiusKm: String(radiusKm), sort: sortOrder, view };
    for (const [key, value] of Object.entries(values)) {
      const isDefault = (key === "search" && !value) || (key === "quick" && value === "all") || (key === "category" && value === "All categories") || (key === "budget" && value === "any") || (key === "deadline" && value === "any") || (key === "origin" && value === (viewer.signedIn ? defaultOrigin.id : ANYWHERE)) || (key === "radiusKm" && value === String(DEFAULT_BROWSE_RADIUS_KM)) || (key === "sort" && value === "recommended") || (key === "view" && value === "list");
      if (!isDefault) query.set(key, value);
    }
    if (originId === "map-pin" && pinnedOrigin) {
      query.set("lat", String(pinnedOrigin.latitude));
      query.set("lng", String(pinnedOrigin.longitude));
    }
    const next = query.toString() ? `/tasks?${query.toString()}` : "/tasks";
    if (typeof window !== "undefined" && window.location.pathname + window.location.search !== next) window.history.replaceState(null, "", next);
  }, [budget, category, deadline, originId, pinnedOrigin, quickFilter, radiusKm, router, search, sortOrder, view, viewer.signedIn]);

  function updateOrigin(value: string) {
    setOriginId(value);
    if (value !== "map-pin") setPinnedOrigin(null);
  }

  function selectMapOrigin(coordinates: { latitude: number; longitude: number }) {
    setPinnedOrigin({
      id: "map-pin",
      label: "Pinned map location",
      ...coordinates,
    });
    setOriginId("map-pin");
  }

  const allCategories = [...new Set([
    initialParams.category,
    ...launchCategories.map((category) => category.label),
    ...tasks.map((task) => task.category),
  ].filter(Boolean))].sort();

  const activeFilters = [
    search.trim() ? { id: "search", label: `Search: ${search.trim()}`, clear: () => setSearch("") } : null,
    quickFilter !== "all" ? { id: "quick", label: quickFilters.find((item) => item.id === quickFilter)?.label ?? quickFilter, clear: () => setQuickFilter("all") } : null,
    category !== "All categories" ? { id: "category", label: category, clear: () => setCategory("All categories") } : null,
    budget !== "any" ? { id: "budget", label: budgetOptions.find((item) => item.id === budget)?.label ?? budget, clear: () => setBudget("any") } : null,
    deadline !== "any" ? { id: "deadline", label: deadlineOptions.find((item) => item.id === deadline)?.label ?? deadline, clear: () => setDeadline("any") } : null,
    originId !== (viewer.signedIn ? defaultOrigin.id : ANYWHERE) ? { id: "origin", label: origin?.label ?? "Pinned location", clear: () => { setOriginId(viewer.signedIn ? defaultOrigin.id : ANYWHERE); setPinnedOrigin(null); } } : null,
  ].filter(Boolean) as Array<{ id: string; label: string; clear: () => void }>;

  const mapTasks = results.tasks.map(({ task }) => {
    const source = publicTasks.find((item) => item.id === task.id);
    return { ...task, latitude: source?.latitude, longitude: source?.longitude };
  });

  return (
    <Shell title="Browse Tasks" description="">
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <form onSubmit={(event) => event.preventDefault()} className="flex min-h-12 flex-1 items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
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
              {quickFilters.slice(0, 3).map((filter) => (
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

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={openFilters} variant="outline">Location{origin ? ` · ${origin.label === defaultOrigin.label ? "Saved area" : origin.label}` : " · Anywhere"}</Button>
        <label className="sr-only" htmlFor="browse-category">Category</label>
        <select id="browse-category" className={`${selectClass} max-w-52`} value={category} onChange={(event) => setCategory(event.target.value)}>
          <option>All categories</option>
          {allCategories.map((item) => <option key={item}>{item}</option>)}
        </select>
        <Button onClick={openFilters} variant="outline"><SlidersHorizontal aria-hidden="true" className="h-4 w-4" />Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}</Button>
      </div>

      {!viewer.signedIn ? (
        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
          Sign in to apply or message.
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

      <div className="mt-8">
        <dialog ref={dialogRef} aria-labelledby="browse-filter-title" className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-950 shadow-xl backdrop:bg-black/60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
          <div className="flex items-center justify-between"><h2 id="browse-filter-title" className="text-xl font-semibold">Filters</h2><button type="button" aria-label="Close filters" className="rounded-lg p-2 focus-visible:ring-2 focus-visible:ring-yellow-400" onClick={() => dialogRef.current?.close()}><X className="h-5 w-5" /></button></div>
          <label className="mt-5 grid gap-2 text-sm font-medium">Task type<select className={selectClass} value={quickFilter} onChange={(event) => setQuickFilter(event.target.value as BrowseQuick)}>{quickFilters.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <fieldset className="mt-5 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <legend className="px-1 text-sm font-bold">Search area</legend>
            <div className="mt-2 grid gap-3">
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                Origin
                <select
                  aria-label="Search origin"
                  className={selectClass}
                  onChange={(event) => updateOrigin(event.target.value)}
                  value={originId}
                >
                  {originChoices.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                  {pinnedOrigin ? <option value="map-pin">Pinned map location</option> : null}
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
              <LeafletLocationPicker
                center={origin ?? PHILIPPINES_MAP_CENTER}
                label="Choose a task search origin on the map"
                onSelect={selectMapOrigin}
                radiusKm={origin ? radiusKm : null}
                selected={origin}
                zoom={originId === "map-pin" ? 14 : origin ? 11 : 6}
              />
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
        <Button className="mt-5 w-full" onClick={() => dialogRef.current?.close()}>Show results</Button>
        </dialog>

        <section className={view === "map" ? "w-full" : undefined}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p aria-live="polite" className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {!ready
                  ? "Loading tasks…"
                  : `${results.tasks.length} ${results.tasks.length === 1 ? "task" : "tasks"}`}
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
              <div className="flex rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900" role="group" aria-label="Result view">
                <button aria-pressed={view === "list"} className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ${view === "list" ? "bg-[#FFC800] text-zinc-950" : "text-zinc-500"}`} onClick={() => setView("list")} type="button"><LayoutGrid className="h-4 w-4" />Grid</button>
                <button aria-pressed={view === "map"} className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold ${view === "map" ? "bg-[#FFC800] text-zinc-950" : "text-zinc-500"}`} onClick={() => setView("map")} type="button"><Map className="h-4 w-4" />Map</button>
              </div>
            </div>
          </div>
          {activeFilters.length ? <div aria-label="Active filters" className="mt-4 flex flex-wrap gap-2">{activeFilters.map((filter) => <button className="inline-flex items-center gap-1.5 rounded-full bg-[#FFC800]/25 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-[#FFC800]/45 dark:text-zinc-100" key={filter.id} onClick={filter.clear} type="button">{filter.label}<X aria-hidden="true" className="h-3.5 w-3.5" /></button>)}<button className="px-2 text-xs font-semibold text-zinc-500 underline underline-offset-4" onClick={resetFilters} type="button">Clear all</button></div> : null}
          {view === "map" ? <div className="mt-5"><TaskMap tasks={mapTasks} /><p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Remote tasks and local tasks without an approximate location remain available in List view.</p></div> : <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
                  variant="browse"
                />
              ))
            ) : (
              <Card><CardContent className="grid min-h-48 place-items-center p-6 text-center">
                <div>
                  <p className="font-semibold">No matching tasks.</p>
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {origin ? `Try a wider radius than ${radiusKm} km, another origin, or fewer filters.` : "Try a different search or fewer filters."}
                  </p>
                  <Button className="mt-4" onClick={resetFilters} type="button" variant="outline">Reset filters</Button>
                </div>
              </CardContent></Card>
            )}
          </div>}
        </section>
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
