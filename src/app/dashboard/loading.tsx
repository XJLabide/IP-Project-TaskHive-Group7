import { AppShell } from "@/components/layout/app-shell";

export default function DashboardLoading() {
  return (
    <AppShell
      title="Dashboard"
      description="Your tasks, applications, messages, and earnings in one place."
      showHeader={false}
      showMobilePrimaryAction={false}
    >
      <div aria-busy="true" className="grid gap-6" role="status">
        <span className="sr-only">Loading your dashboard…</span>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-3"><div className="h-8 w-64 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" /><div className="h-4 w-48 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900" /></div>
          <div className="h-10 w-36 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div aria-hidden="true" className="h-28 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" key={index} />)}</div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.85fr)_minmax(18rem,1fr)]">
          <div className="grid gap-3">{Array.from({ length: 4 }, (_, index) => <div aria-hidden="true" className="h-24 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" key={index} />)}</div>
          <div className="grid content-start gap-4"><div aria-hidden="true" className="h-56 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" /><div aria-hidden="true" className="h-52 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" /></div>
        </div>
      </div>
    </AppShell>
  );
}
