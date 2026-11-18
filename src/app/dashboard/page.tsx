"use client";

import { useViewer } from "@/components/viewer/viewer-provider";
import { DashboardHero, DashboardAttention } from "@/components/dashboard/overview";
import { TaskDiscovery } from "@/components/dashboard/task-discovery";
import { AppShell } from "@/components/layout/app-shell";
import { useDemoDashboardData } from "@/components/dashboard/use-dashboard-data";
import { usePersistentDashboardData } from "@/components/dashboard/use-persistent-dashboard-data";
import { shouldUseMarketplacePreview } from "@/lib/marketplace/preview";

export default function DashboardPage() {
  const { isPreview } = useViewer();
  return shouldUseMarketplacePreview(isPreview) ? <DemoDashboard /> : <PersistentDashboard />;
}

function DemoDashboard() {
  return <DashboardScreen data={useDemoDashboardData()} persistentCounts={false} />;
}

function PersistentDashboard() {
  return <DashboardScreen data={usePersistentDashboardData()} persistentCounts />;
}

function DashboardScreen({ data, persistentCounts }: { data: ReturnType<typeof useDemoDashboardData>; persistentCounts: boolean }) {
  const { tasks, applications, viewer, data: dashboard, now, state } = data;
  return (
    <AppShell description="Discover tasks and manage your work." showHeader={false} title="Dashboard">
      <div className="grid gap-6 sm:gap-8">
        <DashboardHero canPost={viewer.canPost} signedIn={viewer.signedIn} name={viewer.displayName} />
        {state === "ready" ? <DashboardAttention actions={dashboard.actions} applicationCount={dashboard.awaitingReview.length} now={now} /> : null}
        <TaskDiscovery
          applications={applications}
          error={state === "error"}
          loading={state === "loading"}
          persistentCounts={persistentCounts}
          tasks={tasks}
        />
      </div>
    </AppShell>
  );
}
