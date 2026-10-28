"use client";

import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import {
  ActionsPanel,
  AssignmentsPanel,
  PostedTasksPanel,
  ReviewQueue,
} from "@/components/dashboard/panels";
import {
  DashboardError,
  DashboardLoading,
  DashboardSignedOut,
} from "@/components/dashboard/states";
import { useDashboardData } from "@/components/dashboard/use-dashboard-data";
import { Button } from "@/components/ui/button";

export default function MyWorkPage() {
  const { viewer, data, now, state } = useDashboardData();

  return (
    <AppShell
      description="Offers, tasks, assignments, and payment actions tied to your account."
      showHeader={false}
      title="My Work"
    >
      <div className="grid gap-7 sm:gap-9">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
              My Work
            </h1>
            <p className="mt-2 max-w-3xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
              Keep track of tasks, offers, and work in progress.
            </p>
          </div>
          {viewer.canPost ? (
            <Button asChild>
              <Link href="/tasks/new">
                <Plus aria-hidden="true" className="h-4 w-4" />
                Create a task
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/tasks">
                Browse tasks
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </header>

        {state === "loading" ? <DashboardLoading /> : null}
        {state === "error" ? <DashboardError /> : null}
        {state === "signed_out" ? <DashboardSignedOut /> : null}

        {state === "ready" || state === "empty" ? (
          <div className="grid gap-6">
            <ActionsPanel actions={data.actions} now={now} />
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
              <div className="grid gap-6">
                <PostedTasksPanel canPost={viewer.canPost} rows={data.postedTasks} />
                <ActivityFeed items={data.activity} />
              </div>
              <div className="grid content-start gap-6">
                <ReviewQueue rows={data.awaitingReview} />
                <AssignmentsPanel rows={data.activeAssignments} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
