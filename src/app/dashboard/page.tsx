"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { MetricGrid } from "@/components/dashboard/metrics";
import {
  ActionsPanel,
  AssignmentsPanel,
  PostedTasksPanel,
  ReviewQueue,
} from "@/components/dashboard/panels";
import {
  DashboardEmpty,
  DashboardError,
  DashboardLoading,
  DashboardSignedOut,
} from "@/components/dashboard/states";
import { useViewer } from "@/components/viewer/viewer-provider";
import { buildDashboard, dashboardViewState } from "@/lib/dashboard/data";
import { dashboardGreeting, dashboardMetrics } from "@/lib/dashboard/ui";
import { useMarketplace } from "@/lib/mock-marketplace-store";
import { useMockTasks } from "@/lib/mock-task-store";

export default function DashboardPage() {
  const { tasks, ready, error } = useMockTasks();
  const { applications, assignments, chats } = useMarketplace();
  const { viewer } = useViewer();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const data = useMemo(
    () =>
      buildDashboard({
        viewer,
        tasks,
        applications,
        assignments,
        chats,
        now,
      }),
    [viewer, tasks, applications, assignments, chats, now],
  );
  const state = dashboardViewState({
    ready,
    error,
    scope: data.scope,
  });
  const metrics = data.summary ? dashboardMetrics(data.summary) : [];

  return (
    <AppShell
      description="Your HiveDesk workspace."
      showHeader={false}
      title="Dashboard"
    >
      <div className="grid gap-6 sm:gap-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#D19300] dark:text-[#FFD50D]">
              HiveDesk
            </p>
            <h1
              className="mt-2 text-[32px] font-bold leading-[1.15] tracking-[-0.025em] text-zinc-950 dark:text-zinc-50"
              suppressHydrationWarning
            >
              {dashboardGreeting(data.displayName, now)}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Your tasks, applications, assignments, and payment holds in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/tasks">Browse tasks</Link>
            </Button>
            {viewer.canPost ? (
              <Button asChild>
                <Link href="/tasks/new">
                  <Plus className="h-4 w-4" />
                  Post a task
                </Link>
              </Button>
            ) : !viewer.signedIn ? (
              <Button asChild>
                <Link href="/login">Sign in</Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/profile">Complete profile</Link>
              </Button>
            )}
          </div>
        </header>

        {state === "loading" ? <DashboardLoading /> : null}
        {state === "error" ? <DashboardError /> : null}
        {state === "signed_out" ? <DashboardSignedOut /> : null}

        {state === "empty" ? (
          <>
            <MetricGrid metrics={metrics} />
            <DashboardEmpty canPost={viewer.canPost} />
          </>
        ) : null}

        {state === "ready" ? (
          <>
            <MetricGrid metrics={metrics} />
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="xl:col-start-1 xl:row-start-1">
                <ActionsPanel actions={data.actions} now={now} />
              </div>
              <div className="xl:col-start-1 xl:row-start-2">
                <ReviewQueue rows={data.awaitingReview} />
              </div>
              <div className="xl:col-start-1 xl:row-start-3">
                <AssignmentsPanel rows={data.activeAssignments} />
              </div>
              <div className="xl:col-start-2 xl:row-span-4 xl:row-start-1">
                <ActivityFeed items={data.activity} />
              </div>
              <div className="xl:col-start-1 xl:row-start-4">
                <PostedTasksPanel canPost={viewer.canPost} rows={data.postedTasks} />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
