"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PublicPageLoading } from "@/components/layout/public-page-loading";
import { Card, CardContent } from "@/components/ui/card";
import { useViewer } from "@/components/viewer/viewer-provider";

export default function ReviewsLoading() {
  const { viewer } = useViewer();
  if (!viewer.signedIn) return <PublicPageLoading />;

  return (
    <AppShell description="Blind reviews from completed tasks." title="Two-Way Reviews">
      <div aria-busy="true" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]" role="status">
        <span className="sr-only">Loading your reviews…</span>
        <div className="grid gap-3">
          {[0, 1].map((item) => (
            <Card key={item}><CardContent className="grid gap-4 p-5 sm:p-6">
              <div className="h-3 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-6 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-24 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800/70" />
            </CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="grid gap-3 p-5">
          <div className="h-5 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-24 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800/70" />
        </CardContent></Card>
      </div>
    </AppShell>
  );
}
