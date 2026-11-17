"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PublicShell } from "@/components/layout/public-shell";
import { TaskCard } from "@/components/task/task-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useViewer } from "@/components/viewer/viewer-provider";
import { requestData } from "@/lib/marketplace/http";
import type { PublicTaskSummary } from "@/lib/tasks/discovery";
import type { TaskSummary } from "@/lib/tasks/types";
import { launchCategories } from "@/lib/tasks/policy";

type PublicTaskListResponse = {
  tasks: Array<PublicTaskSummary & { distanceKm: number | null }>;
  pagination: { total: number; page: number; pageSize: number; totalPages: number };
};
type TaskType = "all" | "local" | "remote" | "bidding" | "fixed_price";
type BudgetRange = "any" | "under-500" | "500-1000" | "over-1000";

function toTaskSummary(task: PublicTaskSummary): TaskSummary {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    category: task.category ?? "",
    fulfillmentMode: task.fulfillmentMode,
    hiringMode: task.hiringMode,
    budget: task.budgetCents / 100,
    location: task.areaLabel,
    deadline: task.deadline ?? "",
    status: "open",
    poster: task.posterName ?? "Task Poster",
    applications: task.applicationCount,
  };
}

function toOwnedTask(task: TaskSummary): TaskSummary {
  return task;
}

function buildDiscoveryQuery(input: {
  search: string;
  category: string;
  type: TaskType;
  budget: BudgetRange;
  deadlineDays: string;
  sort: string;
  initialParams: Record<string, string>;
}) {
  const query = new URLSearchParams({ page: "1", pageSize: "50" });
  if (input.search.trim()) query.set("q", input.search.trim());
  if (input.category !== "All categories") query.set("category", input.category);
  if (input.type === "local" || input.type === "remote") query.set("fulfillment", input.type);
  if (input.type === "bidding" || input.type === "fixed_price") query.set("hiring", input.type);
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
  const { lat, lng, radiusKm } = input.initialParams;
  if (lat && lng) {
    query.set("lat", lat);
    query.set("lng", lng);
    if (radiusKm) query.set("radiusKm", radiusKm);
  }
  return query.toString();
}

export function PersistentTaskBrowser({ initialParams }: { initialParams: Record<string, string> }) {
  const { viewer } = useViewer();
  const [search, setSearch] = useState(initialParams.search ?? "");
  const [category, setCategory] = useState(initialParams.category || "All categories");
  const [type, setType] = useState<TaskType>("all");
  const [budget, setBudget] = useState<BudgetRange>("any");
  const [deadlineDays, setDeadlineDays] = useState("any");
  const [sort, setSort] = useState("recommended");
  const [publicTasks, setPublicTasks] = useState<Array<{ task: TaskSummary; distanceKm: number | null }>>([]);
  const [ownedTasks, setOwnedTasks] = useState<TaskSummary[]>([]);
  const [pagination, setPagination] = useState<PublicTaskListResponse["pagination"] | null>(null);
  const [loadedQuery, setLoadedQuery] = useState("");
  const [error, setError] = useState("");
  const [ownedError, setOwnedError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

  const query = useMemo(() => buildDiscoveryQuery({ search, category, type, budget, deadlineDays, sort, initialParams }), [
    search, category, type, budget, deadlineDays, sort, initialParams,
  ]);
  const isLoading = loadedQuery !== query;
  const categories = [...new Set([...launchCategories.map((item) => item.label), ...ownedTasks.map((task) => task.category)])].sort();

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setError("");
      void requestData<PublicTaskListResponse>(`/api/tasks?${query}`, { signal: controller.signal })
        .then((result) => {
          setPublicTasks(result.tasks.map((task) => ({ task: toTaskSummary(task), distanceKm: task.distanceKm })));
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
  }, [query]);

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
      setPublicTasks((current) => [...current, ...result.tasks.map((task) => ({ task: toTaskSummary(task), distanceKm: task.distanceKm }))]);
      setPagination(result.pagination);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load more tasks.");
    } finally {
      setLoadingMore(false);
    }
  }

  const managedTasks = ownedTasks.filter((task) => task.status !== "open");
  const Shell = viewer.signedIn ? AppShell : PublicShell;

  return (
    <Shell title="Browse Tasks" description="Find work shared by Posters across the Philippines.">
      <div className="grid gap-4">
        <Card><CardContent className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:p-5">
          <label className="grid gap-1.5 text-sm font-medium"><span>Search tasks</span><input aria-label="Search tasks, locations, or categories" className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-[#D19300] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" onChange={(event) => setSearch(event.target.value)} placeholder="Title, details, or area" type="search" value={search} /></label>
          <label className="grid gap-1.5 text-sm font-medium"><span>Category</span><select className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900" onChange={(event) => setCategory(event.target.value)} value={category}><option>All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="grid gap-1.5 text-sm font-medium"><span>Sort</span><select className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900" onChange={(event) => setSort(event.target.value)} value={sort}><option value="recommended">Recommended</option><option value="nearest">Nearest first</option><option value="budget_asc">Lowest budget</option><option value="budget_desc">Highest budget</option><option value="deadline">Deadline soonest</option></select></label>
          <div className="flex flex-wrap gap-2 sm:col-span-3">
            {([ ["all", "All tasks"], ["local", "Local"], ["remote", "Remote"], ["bidding", "Bidding"], ["fixed_price", "Fixed price"] ] as const).map(([value, label]) => <Button aria-pressed={type === value} key={value} onClick={() => setType(value)} size="sm" type="button" variant={type === value ? "default" : "outline"}>{label}</Button>)}
            <select aria-label="Budget" className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900" onChange={(event) => setBudget(event.target.value as BudgetRange)} value={budget}><option value="any">Any budget</option><option value="under-500">Under PHP 500</option><option value="500-1000">PHP 500–1,000</option><option value="over-1000">Over PHP 1,000</option></select>
            <select aria-label="Deadline" className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900" onChange={(event) => setDeadlineDays(event.target.value)} value={deadlineDays}><option value="any">Any deadline</option><option value="3">Within 3 days</option><option value="7">Within 7 days</option><option value="30">Within 30 days</option></select>
          </div>
        </CardContent></Card>

        {!viewer.signedIn ? <p className="text-sm text-zinc-500 dark:text-zinc-400">Sign in to apply or message. <Link className="font-semibold text-[#D19300] underline underline-offset-4 dark:text-[#FFD50D]" href="/login">Sign in</Link></p> : null}
        {error ? <Card><CardContent className="p-5"><p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p></CardContent></Card> : null}
        <div aria-live="polite" className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400"><span>{isLoading ? "Loading tasks…" : `${pagination?.total ?? publicTasks.length} tasks`}</span>{viewer.canPost ? <Button asChild size="sm" variant="outline"><Link href="/tasks/new">Create task</Link></Button> : null}</div>
        {isLoading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <div aria-hidden="true" className="h-72 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" key={item} />)}</div> : publicTasks.length === 0 && !error ? <Card><CardContent className="grid min-h-40 place-items-center p-6 text-center"><div><p className="font-semibold">No open tasks match these filters.</p><p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Try a wider search or clear a filter.</p></div></CardContent></Card> : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{publicTasks.map(({ task, distanceKm }) => <TaskCard applicationCount={task.applications} distanceKm={distanceKm} key={task.id} task={task} variant="browse" />)}</div>
        )}
        {pagination && pagination.page < pagination.totalPages ? <div className="flex justify-center"><Button disabled={loadingMore || isLoading} onClick={() => void loadMore()} type="button" variant="outline">{loadingMore ? "Loading…" : "Load more tasks"}</Button></div> : null}

        {viewer.signedIn && managedTasks.length > 0 ? <section className="mt-8 grid gap-4"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-bold">Your tasks</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Drafts, payment holds, assignments, and retained task history.</p></div><Button asChild size="sm" variant="outline"><Link href="/tasks/new">Create task</Link></Button></div>{ownedError ? <p role="alert" className="text-sm text-red-700 dark:text-red-400">{ownedError}</p> : null}<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{managedTasks.map((task) => <TaskCard applicationCount={task.applications} key={task.id} task={toOwnedTask(task)} />)}</div></section> : null}
      </div>
    </Shell>
  );
}
