"use client";

import { useEffect, useState } from "react";
import { useViewer } from "@/components/viewer/viewer-provider";
import { dashboardViewState, emptyDashboardData, type DashboardData } from "@/lib/dashboard/data";
import { requestData } from "@/lib/marketplace/http";
import type { PublicTaskSummary } from "@/lib/tasks/discovery";
import type { TaskSummary } from "@/lib/tasks/types";
import { publicTaskToSummary } from "@/lib/tasks/public-ui";

type DashboardPayload = { data: DashboardData; tasks: TaskSummary[] };
type PublicTaskListResponse = { tasks: PublicTaskSummary[] };

/** Production dashboard reads persistent account data and public discovery data. */
export function usePersistentDashboardData() {
  const { viewer } = useViewer();
  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const dashboard = viewer.signedIn
      ? requestData<DashboardData>("/api/dashboard", { signal: controller.signal })
      : Promise.resolve(emptyDashboardData({ signedIn: false, displayName: null }));
    void Promise.all([
      dashboard,
      requestData<PublicTaskListResponse>("/api/tasks?page=1&pageSize=50", { signal: controller.signal }),
    ])
      .then(([data, result]) => {
        setPayload({ data, tasks: result.tasks.map((task) => publicTaskToSummary(task)) });
        setError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [viewer.displayName, viewer.signedIn, reloadCount]);

  const data = payload?.data ?? emptyDashboardData({ signedIn: viewer.signedIn, displayName: viewer.displayName });
  const state = dashboardViewState({
    ready: payload !== null || error,
    error,
    scope: data.scope,
  });

  return {
    tasks: payload?.tasks ?? [],
    applications: [],
    viewer,
    data,
    now: new Date(),
    state,
    retry: () => { setError(false); setReloadCount((count) => count + 1); },
  };
}
