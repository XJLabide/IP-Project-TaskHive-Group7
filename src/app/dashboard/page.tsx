"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import {
  ActionsPanel,
  AssignmentsPanel,
  PostedTasksPanel,
  ReviewQueue,
} from "@/components/dashboard/panels";
import { DashboardHero, HowTaskHiveWorks } from "@/components/dashboard/overview";
import {
  DashboardError,
  DashboardLoading,
  DashboardSignedOut,
} from "@/components/dashboard/states";
import { TaskDiscovery } from "@/components/dashboard/task-discovery";
import { useViewer } from "@/components/viewer/viewer-provider";
import { buildDashboard, dashboardViewState } from "@/lib/dashboard/data";
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
  const initials = (viewer.displayName ?? "TH")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <AppShell
      description="Discover tasks and manage your work."
      showHeader={false}
      title="Dashboard"
    >
      <div className="grid gap-6 sm:gap-8">
        <div className="flex items-center justify-end gap-2">
          <Link
            aria-label="Open chat inbox"
            className="grid h-10 w-10 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-700 transition-colors hover:border-[#D19300] hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD50D] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-[#FFD50D] dark:hover:text-zinc-50"
            href="/chats"
          >
            <MessageSquare aria-hidden="true" className="h-4 w-4" />
          </Link>
          <Link
            aria-label={`Open profile for ${viewer.displayName ?? "your account"}`}
            className="grid h-10 w-10 place-items-center rounded-full bg-zinc-950 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD50D] dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
            href="/profile"
          >
            {initials}
          </Link>
        </div>

        <DashboardHero canPost={viewer.canPost} />
        <HowTaskHiveWorks />
        <TaskDiscovery
          applications={applications}
          error={state === "error"}
          loading={state === "loading"}
          tasks={tasks}
        />

        <section aria-labelledby="your-work-title" className="grid gap-5 border-t border-zinc-200 pt-8 dark:border-zinc-800 sm:gap-6 sm:pt-10">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50" id="your-work-title">
              Your work
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Offers, tasks, assignments, and payment actions tied to your account.
            </p>
          </div>

          {state === "loading" ? <DashboardLoading /> : null}
          {state === "error" ? <DashboardError /> : null}
          {state === "signed_out" ? <DashboardSignedOut /> : null}

          {state === "ready" || state === "empty" ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <ActionsPanel actions={data.actions} now={now} />
              <ReviewQueue rows={data.awaitingReview} />
              <AssignmentsPanel rows={data.activeAssignments} />
              <PostedTasksPanel canPost={viewer.canPost} rows={data.postedTasks} />
              <div className="xl:col-span-2">
                <ActivityFeed items={data.activity} />
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
