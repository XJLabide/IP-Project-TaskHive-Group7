"use client";

import { useEffect, useMemo, useState } from "react";
import { useViewer } from "@/components/viewer/viewer-provider";
import { buildDashboard, dashboardViewState } from "@/lib/dashboard/data";
import { useMarketplace } from "@/lib/mock-marketplace-store";
import { useMockTasks } from "@/lib/mock-task-store";

/** Shared viewer-scoped data for Dashboard and My Work. */
export function useDashboardData() {
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

  return { tasks, applications, viewer, data, now, state };
}
