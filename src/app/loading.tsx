"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PublicPageLoading } from "@/components/layout/public-page-loading";
import { useViewer } from "@/components/viewer/viewer-provider";

export default function AppLoading() {
  const { viewer } = useViewer();
  if (!viewer.signedIn) return <PublicPageLoading />;

  return (
    <AppShell description="Loading the next TaskHive section." title="Loading workspace">
      <div aria-busy="true" className="grid gap-6" role="status">
        <span className="sr-only">Loading page…</span>
        <div className="grid gap-3">
          <div className="h-8 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div className="h-56 animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" key={item} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
