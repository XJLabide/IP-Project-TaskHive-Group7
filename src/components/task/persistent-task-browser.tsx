"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, List, Map as MapIcon, Search, SlidersHorizontal, X } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PublicShell } from "@/components/layout/public-shell";
import { TaskCard } from "@/components/task/task-card";
import { TaskMap } from "@/components/task/task-map";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useViewer } from "@/components/viewer/viewer-provider";
import { requestData } from "@/lib/marketplace/http";
import type { PublicTaskSummary } from "@/lib/tasks/discovery";
import type { TaskSummary } from "@/lib/tasks/types";
import { publicTaskToSummary } from "@/lib/tasks/public-ui";
import { launchCategories } from "@/lib/tasks/policy";

type PublicTaskListResponse = {
  tasks: Array<PublicTaskSummary & { distanceKm: number | null }>;
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
};
type TaskType = "all" | "local" | "remote" | "bidding" | "fixed_price";
type FulfillmentFilter = "all" | "local" | "remote";
type HiringFilter = "all" | "bidding" | "fixed_price";
type BudgetRange = "any" | "under-500" | "500-1000" | "over-1000";

function buildDiscoveryQuery(input: {
  search: string;
  category: string;
  fulfillment: FulfillmentFilter;
  hiring: HiringFilter;
  budget: BudgetRange;
  deadlineDays: string;
  sort: string;
  locationParams: { lat: string; lng: string; radiusKm: string };
}) {
  const query = new URLSearchParams({ page: "1", pageSize: "50" });
  if (input.search.trim()) query.set("q", input.search.trim());
  if (input.category !== "All categories") query.set("category", input.category);
  if (input.fulfillment !== "all") query.set("fulfillment", input.fulfillment);
  if (input.hiring !== "all") query.set("hiring", input.hiring);
  if (input.budget === "under-500") query.set("budgetMaxCents", "49999");
  if (input.budget === "500-1000") {
    query.set("budgetMinCents", "50000");
    query.set("budgetMaxCents", "100000");
  }
  if (input.budget === "over-1000") query.set("budgetMinCents", "100001");
  if (input.deadlineDays !== "any") {
    const deadline = new Date(Date.now() + Number(input.deadlineDays) * 24 * 60 * 60 * 1000);
    query.set("deadlineBefore", deadline.toISOString());
  }
  if (["recommended", "nearest", "budget_asc", "budget_desc", "deadline"].includes(input.sort)) query.set("sort", input.sort);
  const { lat, lng, radiusKm } = input.locationParams;
  if (lat && lng) {
    query.set("lat", lat);
    query.set("lng", lng);
    if (radiusKm) query.set("radiusKm", radiusKm);
  }
  return query.toString();
}

function GuestFilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-medium">
      <span>{label}</span>
      <span className="relative block">
        <select
          className="h-11 w-full appearance-none rounded-lg border border-zinc-300 bg-white py-2 pl-3 pr-12 text-sm text-zinc-950 outline-none hover:border-zinc-500 focus-visible:border-[#D19300] focus-visible:ring-2 focus-visible:ring-[#FFC800]/35 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-zinc-500"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        >
          {children}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" />
      </span>
    </label>
  );
}

export function PersistentTaskBrowser({ initialParams }: { initialParams: Record<string, string> }) {
  const { viewer } = useViewer();
  const [search, setSearch] = useState(initialParams.search ?? initialParams.q ?? "");
  const [category, setCategory] = useState(initialParams.category || "All categories");
  const [type, setType] = useState<TaskType>((initialParams.type as TaskType) || "all");
  const [guestFulfillment, setGuestFulfillment] = useState<FulfillmentFilter>(() => {
    const value = initialParams.fulfillment ?? initialParams.type;
    return value === "local" || value === "remote" ? value : "all";
  });
  const [guestHiring, setGuestHiring] = useState<HiringFilter>(() => {
    const value = initialParams.hiring ?? initialParams.type;
    return value === "bidding" || value === "fixed_price" ? value : "all";
  });
  const [budget, setBudget] = useState<BudgetRange>((initialParams.budget as BudgetRange) || "any");
  const [deadlineDays, setDeadlineDays] = useState(initialParams.deadline ?? "any");
  const [sort, setSort] = useState(initialParams.sort ?? "recommended");
  const [view, setView] = useState<"list" | "map">(initialParams.view === "map" ? "map" : "list");
  const [locationParams, setLocationParams] = useState(() => ({
    lat: initialParams.lat ?? "",
    lng: initialParams.lng ?? "",
    radiusKm: initialParams.radiusKm ?? "",
  }));
  const filterDetailsRef = useRef<HTMLDetailsElement>(null);
  const guestFilterDialogRef = useRef<HTMLDialogElement>(null);
  const [publicTasks, setPublicTasks] = useState<Array<{ task: TaskSummary; distanceKm: number | null }>>([]);
  const [ownedTasks, setOwnedTasks] = useState<TaskSummary[]>([]);
  const [pagination, setPagination] = useState<PublicTaskListResponse["pagination"] | null>(null);
  const [loadedQuery, setLoadedQuery] = useState("");
  const [error, setError] = useState("");
  const [ownedError, setOwnedError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  const fulfillment: FulfillmentFilter = viewer.signedIn && (type === "local" || type === "remote") ? type : viewer.signedIn ? "all" : guestFulfillment;
  const hiring: HiringFilter = viewer.signedIn && (type === "bidding" || type === "fixed_price") ? type : viewer.signedIn ? "all" : guestHiring;
  const query = useMemo(() => buildDiscoveryQuery({ search, category, fulfillment, hiring, budget, deadlineDays, sort, locationParams }), [
    search, category, fulfillment, hiring, budget, deadlineDays, sort, locationParams,
  ]);
  const isLoading = loadedQuery !== query;
  const categories = [...new Set([...launchCategories.map((item) => item.label), ...ownedTasks.map((task) => task.category)])].sort();

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 640px)");
    const syncDisclosure = () => {
      if (filterDetailsRef.current) filterDetailsRef.current.open = desktop.matches;
    };
    syncDisclosure();
    desktop.addEventListener("change", syncDisclosure);
    return () => desktop.removeEventListener("change", syncDisclosure);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (category !== "All categories") params.set("category", category);
    if (viewer.signedIn && type !== "all") params.set("type", type);
    if (!viewer.signedIn && guestFulfillment !== "all") params.set("fulfillment", guestFulfillment);
    if (!viewer.signedIn && guestHiring !== "all") params.set("hiring", guestHiring);
    if (budget !== "any") params.set("budget", budget);
    if (deadlineDays !== "any") params.set("deadline", deadlineDays);
    if (sort !== "recommended") params.set("sort", sort);
    if (locationParams.lat) params.set("lat", locationParams.lat);
    if (locationParams.lng) params.set("lng", locationParams.lng);
    if (locationParams.radiusKm) params.set("radiusKm", locationParams.radiusKm);
    if (view === "map") params.set("view", "map");
    const nextPath = view === "map" ? "/map" : "/tasks";
    const next = `${nextPath}${params.size ? `?${params}` : ""}`;
    window.history.replaceState(null, "", next);
  }, [search, category, type, guestFulfillment, guestHiring, budget, deadlineDays, sort, view, locationParams, viewer.signedIn]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setError("");
      void requestData<PublicTaskListResponse>(`/api/tasks?${query}`, { signal: controller.signal })
        .then((result) => {
          setPublicTasks(result.tasks.map((task) => ({ task: publicTaskToSummary(task), distanceKm: task.distanceKm })));
          setPagination(result.pagination);
          setLoadedQuery(query);
        })
        .catch((reason: unknown) => {
          if (!controller.signal.aborted) {
            setError(reason instanceof Error ? reason.message : "Could not load tasks. Please try again.");
            setLoadedQuery(query);
          }
        });
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, reloadCount]);

  function clearFilters() {
    setSearch("");
    setCategory("All categories");
    setType("all");
    setGuestFulfillment("all");
    setGuestHiring("all");
    setBudget("any");
    setDeadlineDays("any");
    setSort("recommended");
    setLocationParams({ lat: "", lng: "", radiusKm: "" });
  }

  useEffect(() => {
    if (!viewer.signedIn) return;
    const controller = new AbortController();
    void requestData<TaskSummary[]>("/api/tasks/mine", { signal: controller.signal })
      .then(setOwnedTasks)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setOwnedError(reason instanceof Error ? reason.message : "Could not load your tasks.");
      });
    return () => controller.abort();
  }, [viewer.signedIn]);

  async function loadMore() {
    if (!pagination || pagination.page >= pagination.totalPages || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextQuery = new URLSearchParams(query);
      nextQuery.set("page", String(pagination.page + 1));
      const result = await requestData<PublicTaskListResponse>(`/api/tasks?${nextQuery}`);
      setPublicTasks((current) => [...current, ...result.tasks.map((task) => ({ task: publicTaskToSummary(task), distanceKm: task.distanceKm }))]);
      setPagination(result.pagination);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load more tasks.");
    } finally {
      setLoadingMore(false);
    }
  }

  const managedTasks = ownedTasks.filter((task) => task.status !== "open");
  const Shell = viewer.signedIn ? AppShell : PublicShell;
  const resultTotal = pagination?.total ?? publicTasks.length;
  const guestFilterCount = [
    category !== "All categories",
    budget !== "any",
    deadlineDays !== "any",
    guestHiring !== "all",
    Boolean(locationParams.lat && locationParams.lng),
  ].filter(Boolean).length;

  return (
    <Shell title="Browse Tasks" description="Find work shared by Posters across the Philippines.">
      <div className="grid gap-4">
        {!viewer.signedIn ? (
          <section aria-label="Search and filter tasks" className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex h-14 min-w-0 flex-1 items-center gap-3 rounded-xl border border-zinc-300 bg-white px-4 focus-within:border-[#D19300] focus-within:ring-2 focus-within:ring-[#FFC800]/30 dark:border-zinc-700 dark:bg-zinc-900">
                <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-zinc-500 dark:text-zinc-400" />
                <input aria-label="Search tasks, categories, or areas" className="min-w-0 flex-1 bg-transparent text-base text-zinc-950 outline-none placeholder:text-zinc-500 dark:text-zinc-100 dark:placeholder:text-zinc-400" maxLength={100} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks, categories, or areas" type="search" value={search} />
              </label>
              <button aria-controls="guest-task-filters" aria-haspopup="dialog" className="inline-flex h-14 items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-900 hover:border-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC800] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500" onClick={() => guestFilterDialogRef.current?.showModal()} type="button">
                <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />Filters{guestFilterCount > 0 ? <span className="rounded-full bg-[#FFC800] px-1.5 text-xs leading-5 text-zinc-950">{guestFilterCount}</span> : null}
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
              <div aria-label="Task location" className="flex flex-wrap gap-2" role="group">
                {([ ["all", "All tasks"], ["local", "Local"], ["remote", "Remote"] ] as const).map(([value, label]) => (
                  <button aria-pressed={guestFulfillment === value} className={`h-10 rounded-full border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC800] ${guestFulfillment === value ? "border-[#FFC800] bg-[#FFC800] text-zinc-950" : "border-zinc-300 bg-transparent text-zinc-700 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-500"}`} key={value} onClick={() => setGuestFulfillment(value)} type="button">{label}</button>
                ))}
              </div>
              <div className="flex items-center gap-3 sm:ml-auto">
                <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">Sort
                  <span className="relative inline-flex items-center">
                    <select aria-label="Sort tasks" className="max-w-40 cursor-pointer appearance-none bg-transparent py-1 pl-1 pr-8 font-medium text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-[#FFC800] dark:text-zinc-100" onChange={(event) => setSort(event.target.value)} value={sort}><option value="recommended">Recommended</option><option value="nearest">Nearest first</option><option value="budget_asc">Lowest budget</option><option value="budget_desc">Highest budget</option><option value="deadline">Deadline soonest</option></select>
                    <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                  </span>
                </label>
                <div aria-label="Task view" className="flex rounded-lg border border-zinc-300 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-800" role="group">
                  <button aria-label="List view" aria-pressed={view === "list"} className={`grid h-8 w-9 place-items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC800] ${view === "list" ? "bg-[#FFC800] text-zinc-950" : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"}`} onClick={() => setView("list")} title="List view" type="button"><List aria-hidden="true" className="h-4 w-4" /></button>
                  <button aria-label="Map view" aria-pressed={view === "map"} className={`grid h-8 w-9 place-items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC800] ${view === "map" ? "bg-[#FFC800] text-zinc-950" : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"}`} onClick={() => setView("map")} title="Map view" type="button"><MapIcon aria-hidden="true" className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
            {guestFilterCount > 0 ? <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400"><span>{guestFilterCount} active {guestFilterCount === 1 ? "filter" : "filters"}</span><button className="font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC800]" onClick={clearFilters} type="button">Clear all</button></div> : null}
            <dialog aria-labelledby="guest-filter-title" className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[min(92vw,440px)] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-950 shadow-xl backdrop:bg-zinc-950/65 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" id="guest-task-filters" onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }} ref={guestFilterDialogRef}>
              <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
                <h2 className="text-lg font-semibold" id="guest-filter-title">Filters</h2>
                <button aria-label="Close filters" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC800] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100" onClick={() => guestFilterDialogRef.current?.close()} type="button"><X aria-hidden="true" className="h-5 w-5" /></button>
              </div>
              <div className="grid gap-5 px-5 py-5">
                <GuestFilterSelect label="Category" onChange={setCategory} value={category}>
                  <option>All categories</option>
                  {categories.map((item) => <option key={item}>{item}</option>)}
                </GuestFilterSelect>
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">Hiring type</legend>
                  <div className="grid grid-cols-3 gap-2">
                    {([ ["all", "Any"], ["bidding", "Bidding"], ["fixed_price", "Fixed price"] ] as const).map(([value, label]) => (
                      <button aria-pressed={guestHiring === value} className={`min-h-10 rounded-lg border px-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC800] ${guestHiring === value ? "border-[#FFC800] bg-[#FFC800] text-zinc-950" : "border-zinc-300 text-zinc-700 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-500"}`} key={value} onClick={() => setGuestHiring(value)} type="button">{label}</button>
                    ))}
                  </div>
                </fieldset>
                <div className="grid gap-5 sm:grid-cols-2 sm:gap-3">
                  <GuestFilterSelect label="Budget" onChange={(value) => setBudget(value as BudgetRange)} value={budget}>
                    <option value="any">Any budget</option><option value="under-500">Under PHP 500</option><option value="500-1000">PHP 500–1,000</option><option value="over-1000">Over PHP 1,000</option>
                  </GuestFilterSelect>
                  <GuestFilterSelect label="Deadline" onChange={setDeadlineDays} value={deadlineDays}>
                    <option value="any">Any deadline</option><option value="3">Within 3 days</option><option value="7">Within 7 days</option><option value="30">Within 30 days</option>
                  </GuestFilterSelect>
                </div>
                {locationParams.lat && locationParams.lng ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800">
                    <span>Location area · {locationParams.radiusKm ? `${locationParams.radiusKm} km` : "default radius"}</span>
                    <button className="font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC800]" onClick={() => setLocationParams({ lat: "", lng: "", radiusKm: "" })} type="button">Clear</button>
                  </div>
                ) : null}
              </div>
              <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-zinc-200 bg-white px-5 py-4 dark:border-zinc-700 dark:bg-zinc-900">
                <button className="text-sm font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC800]" onClick={clearFilters} type="button">Clear all</button>
                <Button onClick={() => guestFilterDialogRef.current?.close()} size="sm" type="button">Show results</Button>
              </div>
            </dialog>
          </section>
        ) : (
        <Card><CardContent className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:p-5">
          <label className="grid gap-1.5 text-sm font-medium"><span>Search tasks</span><input aria-label="Search tasks, locations, or categories" className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-[#D19300] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" onChange={(event) => setSearch(event.target.value)} placeholder="Title, details, or area" type="search" value={search} /></label>
          <div className="hidden gap-2 sm:flex sm:col-span-2">
            {([ ["all", "All tasks"], ["local", "Local"], ["remote", "Remote"], ["bidding", "Bidding"], ["fixed_price", "Fixed price"] ] as const).map(([value, label]) => <Button aria-pressed={type === value} key={value} onClick={() => setType(value)} size="sm" type="button" variant={type === value ? "default" : "outline"}>{label}</Button>)}
            <div aria-label="Task view" className="ml-auto flex gap-2"><Button aria-pressed={view === "list"} onClick={() => setView("list")} size="sm" type="button" variant={view === "list" ? "default" : "outline"}>List</Button><Button aria-pressed={view === "map"} onClick={() => setView("map")} size="sm" type="button" variant={view === "map" ? "default" : "outline"}>Map</Button></div>
          </div>
          <details className="group sm:col-span-3" ref={filterDetailsRef}><summary className="flex h-10 cursor-pointer list-none items-center justify-between rounded-lg border border-zinc-200 px-3 text-sm font-medium dark:border-zinc-700 sm:hidden"><span>Filters and sorting</span><span aria-hidden="true">{type !== "all" || budget !== "any" || deadlineDays !== "any" || category !== "All categories" ? "Filters active" : "＋"}</span></summary><div className="mt-3 grid gap-3 sm:mt-0 sm:grid-cols-3"><label className="grid gap-1.5 text-sm font-medium"><span className="hidden sm:block">Category</span><select aria-label="Category" className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900" onChange={(event) => setCategory(event.target.value)} value={category}><option>All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label className="grid gap-1.5 text-sm font-medium"><span className="hidden sm:block">Sort</span><select aria-label="Sort tasks" className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900" onChange={(event) => setSort(event.target.value)} value={sort}><option value="recommended">Recommended</option><option value="nearest">Nearest first</option><option value="budget_asc">Lowest budget</option><option value="budget_desc">Highest budget</option><option value="deadline">Deadline soonest</option></select></label><div className="flex flex-wrap gap-2">{([ ["all", "All tasks"], ["local", "Local"], ["remote", "Remote"], ["bidding", "Bidding"], ["fixed_price", "Fixed price"] ] as const).map(([value, label]) => <Button aria-pressed={type === value} key={value} onClick={() => setType(value)} size="sm" type="button" variant={type === value ? "default" : "outline"}>{label}</Button>)}</div><label className="grid gap-1.5 text-sm font-medium"><span>Budget</span><select aria-label="Budget" className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900" onChange={(event) => setBudget(event.target.value as BudgetRange)} value={budget}><option value="any">Any budget</option><option value="under-500">Under PHP 500</option><option value="500-1000">PHP 500–1,000</option><option value="over-1000">Over PHP 1,000</option></select></label><label className="grid gap-1.5 text-sm font-medium"><span>Deadline</span><select aria-label="Deadline" className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900" onChange={(event) => setDeadlineDays(event.target.value)} value={deadlineDays}><option value="any">Any deadline</option><option value="3">Within 3 days</option><option value="7">Within 7 days</option><option value="30">Within 30 days</option></select></label><div className="flex items-end gap-2 sm:hidden"><Button aria-pressed={view === "list"} onClick={() => setView("list")} size="sm" type="button" variant={view === "list" ? "default" : "outline"}>List</Button><Button aria-pressed={view === "map"} onClick={() => setView("map")} size="sm" type="button" variant={view === "map" ? "default" : "outline"}>Map</Button></div></div></details>
        </CardContent></Card>
        )}

        {!viewer.signedIn ? <p className="text-sm text-zinc-500 dark:text-zinc-400">Sign in to apply or message. <Link className="font-semibold text-[#D19300] underline underline-offset-4 dark:text-[#FFD50D]" href="/login">Sign in</Link></p> : null}
        {error ? <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 p-5"><p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p><Button onClick={() => setReloadCount((count) => count + 1)} size="sm" type="button" variant="outline">Try again</Button></CardContent></Card> : null}
        <div aria-live="polite" className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400"><span>{isLoading ? "Loading tasks…" : `${resultTotal} ${resultTotal === 1 ? "task" : "tasks"} found`}</span></div>
        {view === "map" ? (
          <TaskMap tasks={publicTasks.map(({ task }) => task)} />
        ) : isLoading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <div aria-hidden="true" className="h-72 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" key={item} />)}</div> : publicTasks.length === 0 && !error ? <Card><CardContent className="grid min-h-40 place-items-center p-6 text-center"><div><p className="font-semibold">No open tasks match these filters.</p><p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Try another location or clear your filters to see more nearby work.</p><Button className="mt-4" onClick={clearFilters} size="sm" type="button" variant="outline">Clear filters</Button></div></CardContent></Card> : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{publicTasks.map(({ task, distanceKm }) => <TaskCard applicationCount={task.applications} distanceKm={distanceKm} key={task.id} task={task} variant="browse" />)}</div>
        )}
        {pagination && pagination.page < pagination.totalPages ? <div className="flex justify-center"><Button disabled={loadingMore || isLoading} onClick={() => void loadMore()} type="button" variant="outline">{loadingMore ? "Loading…" : "Load more tasks"}</Button></div> : null}

        {viewer.signedIn && managedTasks.length > 0 ? <section className="mt-8 grid gap-4"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-bold">Your tasks</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Drafts, payment holds, assignments, and retained task history.</p></div><Button asChild size="sm" variant="outline"><Link href="/tasks/new">Create task</Link></Button></div>{ownedError ? <p role="alert" className="text-sm text-red-700 dark:text-red-400">{ownedError}</p> : null}<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{managedTasks.map((task) => <TaskCard applicationCount={task.applications} key={task.id} task={task} />)}</div></section> : null}
      </div>
    </Shell>
  );
}
