import Link from "next/link";
import { Button } from "@/components/ui/button";

const panelClass =
  "rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900";

export function DashboardLoading() {
  return (
    <div aria-busy="true" className="grid gap-4 md:grid-cols-2" role="status">
      <span className="sr-only">Loading your workspace…</span>
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          aria-hidden="true"
          className="h-40 animate-pulse rounded-2xl border border-zinc-200 bg-white motion-reduce:animate-none dark:border-zinc-800 dark:bg-zinc-900"
          key={index}
        />
      ))}
      <div
        aria-hidden="true"
        className="h-56 animate-pulse rounded-2xl border border-zinc-200 bg-white motion-reduce:animate-none dark:border-zinc-800 dark:bg-zinc-900 md:col-span-2"
      />
    </div>
  );
}

export function DashboardError() {
  return (
    <div className={panelClass} role="alert">
      <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
        We could not read your workspace
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        This browser session could not load its tasks. Reload to try again; nothing was
        deleted.
      </p>
      <Button
        className="mt-4"
        onClick={() => window.location.reload()}
        type="button"
      >
        Try again
      </Button>
    </div>
  );
}

export function DashboardSignedOut() {
  return (
    <div className={panelClass}>
      <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
        Sign in to open your workspace
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        Your tasks, applications, assignments, and payment holds are private to your
        account. Browsing tasks stays open to everyone.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/tasks">Browse tasks</Link>
        </Button>
      </div>
    </div>
  );
}
