"use client";

import { AppShell } from "@/components/layout/app-shell";
import { DashboardHero, DashboardAttention } from "@/components/dashboard/overview";
import { TaskDiscovery } from "@/components/dashboard/task-discovery";
import { useDashboardData } from "@/components/dashboard/use-dashboard-data";

export default function DashboardPage() {
  const { tasks, applications, viewer, data, now, state } = useDashboardData();

  return (
    <AppShell
      description="Discover tasks and manage your work."
      showHeader={false}
      title="Dashboard"
    >
      <div className="grid gap-6 sm:gap-8">
        <DashboardHero canPost={viewer.canPost} signedIn={viewer.signedIn} name={viewer.displayName} />
        {state === "ready" ? <DashboardAttention actions={data.actions} applicationCount={data.awaitingReview.length} now={now} /> : null}
        <TaskDiscovery
          applications={applications}
          error={state === "error"}
          loading={state === "loading"}
          tasks={tasks}
        />
      </div>
    </AppShell>
  );
}
