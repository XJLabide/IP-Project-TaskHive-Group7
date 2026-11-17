"use client";

import { useEffect, useMemo, useState } from "react";
import { useViewer } from "@/components/viewer/viewer-provider";
import { buildDashboard, dashboardViewState, type DashboardData } from "@/lib/dashboard/data";
import { useMarketplace } from "@/lib/mock-marketplace-store";
import { useMockTasks } from "@/lib/mock-task-store";
import { requestData } from "@/lib/marketplace/http";
import { shouldUseMarketplacePreview } from "@/lib/marketplace/preview";
import type { PublicTaskSummary } from "@/lib/tasks/discovery";
import type { TaskSummary } from "@/lib/tasks/types";

type DashboardPayload = { data: DashboardData; tasks: TaskSummary[] };
type PublicTaskListResponse = { tasks: PublicTaskSummary[] };

function asTask(summary: PublicTaskSummary): TaskSummary {
  return {
    id: summary.id,
    title: summary.title,
    description: summary.description,
    category: summary.category ?? "",
    fulfillmentMode: summary.fulfillmentMode,
    hiringMode: summary.hiringMode,
    budget: summary.budgetCents / 100,
    location: summary.areaLabel,
    deadline: summary.deadline ?? "",
    status: "open",
    poster: summary.posterName ?? "Task Poster",
    applications: summary.applicationCount,
  };
}

function emptyDashboard(viewer: { signedIn: boolean; displayName: string | null }): DashboardData {
  return {
    scope: viewer.signedIn ? "empty" : "signed_out",
    displayName: viewer.signedIn ? viewer.displayName : null,
    summary: viewer.signedIn ? { openTasks: 0, awaitingReview: 0, activeAssignments: 0, paymentActions: 0 } : null,
    postedTasks: [],
    awaitingReview: [],
    activeAssignments: [],
    activity: [],
    actions: [],
  };
}

/** Shared viewer-scoped data for Dashboard and My Work. */
export function useDashboardData() {
  const { viewer, isPreview } = useViewer();
  const { displayName, signedIn } = viewer;
  const demoMode = shouldUseMarketplacePreview(isPreview);
  const { tasks: demoTasks, ready, error: demoError } = useMockTasks();
  const demoMarketplace = useMarketplace();
  const [persistent, setPersistent] = useState<DashboardPayload | null>(null);
  const [persistentError, setPersistentError] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (demoMode) return;
    const controller = new AbortController();
    void Promise.all([
      signedIn
        ? requestData<DashboardData>("/api/dashboard", { signal: controller.signal })
        : Promise.resolve(emptyDashboard({ signedIn, displayName })),
      requestData<PublicTaskListResponse>("/api/tasks?page=1&pageSize=50", { signal: controller.signal }),
    ])
      .then(([data, publicTasks]) => {
        setPersistent({ data, tasks: publicTasks.tasks.map(asTask) });
        setPersistentError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPersistentError(true);
      });
    return () => controller.abort();
  }, [demoMode, displayName, signedIn]);

  const data = useMemo(() => {
    if (demoMode) {
      return buildDashboard({
        viewer,
        tasks: demoTasks,
        applications: demoMarketplace.applications,
        assignments: demoMarketplace.assignments,
        chats: demoMarketplace.chats,
        now,
      });
    }
    return persistent?.data ?? emptyDashboard(viewer);
  }, [demoMarketplace.applications, demoMarketplace.assignments, demoMarketplace.chats, demoMode, demoTasks, now, persistent, viewer]);

  const state = dashboardViewState({
    ready: demoMode ? ready : !viewer.signedIn || persistent !== null || persistentError,
    error: demoMode ? demoError : persistentError,
    scope: data.scope,
  });

  return {
    tasks: demoMode ? demoTasks : persistent?.tasks ?? [],
    applications: demoMode ? demoMarketplace.applications : [],
    viewer,
    persistentMode: !demoMode,
    data,
    now,
    state,
  };
}
