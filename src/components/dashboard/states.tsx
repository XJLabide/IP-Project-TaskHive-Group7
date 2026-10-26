import Link from "next/link";
import { Button } from "@/components/ui/button";

const panelClass =
  "rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900";

export function DashboardLoading() {
  return (
    <div aria-busy="true" className="grid gap-6" role="status">
      <span className="sr-only">Loading your workspace…</span>
      <div aria-hidden="true" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            className="h-28 animate-pulse rounded-2xl border border-zinc-200 bg-white motion-reduce:animate-none dark:border-zinc-800 dark:bg-zinc-900"
            key={index}
          />
        ))}
      </div>
      <div aria-hidden="true" className="grid gap-3">
        <div className="h-36 animate-pulse rounded-2xl border border-zinc-200 bg-white motion-reduce:animate-none dark:border-zinc-800 dark:bg-zinc-900" />
        <div className="h-36 animate-pulse rounded-2xl border border-zinc-200 bg-white motion-reduce:animate-none dark:border-zinc-800 dark:bg-zinc-900" />
      </div>
    </div>
  );
}

export function DashboardError() {
  return (
    <div className={panelClass} role="alert">
      <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
        We could not read your workspace
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
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
      <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
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

export function DashboardEmpty({ canPost }: { canPost: boolean }) {
  return (
    <div className={panelClass}>
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#D19300] dark:text-[#FFD50D]">
        Empty workspace
      </p>
      <h2 className="mt-2 text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
        Nothing needs you yet
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        {canPost
          ? "Post your first task or apply for work. This page fills with real applications, assignments, and payment states as they happen."
          : "Apply for work or finish your profile. This page fills with real applications, assignments, and payment states as they happen."}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {canPost ? (
          <Button asChild>
            <Link href="/tasks/new">Post a task</Link>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link href="/tasks">Browse tasks</Link>
        </Button>
      </div>
    </div>
  );
}
