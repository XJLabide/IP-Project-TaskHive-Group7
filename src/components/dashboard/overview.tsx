import Link from "next/link";
import { ArrowUpRight, MessageSquare, Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardAction } from "@/lib/dashboard/data";
import { formatHoldDue } from "@/lib/dashboard/ui";

export function DashboardHero({ canPost, signedIn, name }: { canPost: boolean; signedIn: boolean; name: string | null }) {
  return (
    <header className="flex flex-col gap-5 border-b border-zinc-200 pb-6 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{signedIn && name ? `Welcome back, ${name}.` : "Welcome to TaskHive."}</p>
      </div>
      <div className="grid gap-4 sm:justify-items-end">
        {signedIn ? (
          <nav aria-label="Account shortcuts" className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
            <Link className="inline-flex items-center gap-1.5 rounded focus-visible:outline-yellow-400 hover:text-zinc-950 dark:hover:text-white" href="/chats"><MessageSquare aria-hidden="true" className="h-4 w-4" />Chat</Link>
            <Link className="inline-flex items-center gap-1.5 rounded focus-visible:outline-yellow-400 hover:text-zinc-950 dark:hover:text-white" href="/profile"><UserRound aria-hidden="true" className="h-4 w-4" />Profile</Link>
          </nav>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link href={canPost ? "/tasks/new" : signedIn ? "/profile" : "/login"}><Plus aria-hidden="true" className="h-4 w-4" />{canPost ? "Post a task" : signedIn ? "Complete profile" : "Sign in"}</Link></Button>
          <Button asChild variant="outline"><Link href="/tasks">Browse tasks</Link></Button>
        </div>
      </div>
    </header>
  );
}

export function DashboardAttention({ actions, applicationCount, now }: { actions: DashboardAction[]; applicationCount: number; now: Date }) {
  if (!actions.length && !applicationCount) return null;
  const sorted = [...actions].sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));
  return (
    <section aria-labelledby="attention-title" className="rounded-2xl border border-amber-200/70 bg-[#FFFDF7] p-5 dark:border-amber-400/15 dark:bg-[#19170F]">
      <div className="flex items-center justify-between gap-3">
        <h2 id="attention-title" className="text-base font-semibold">Needs attention</h2>
        <Link href="/my-work" className="rounded text-xs font-medium underline underline-offset-4 focus-visible:outline-yellow-400">My Work</Link>
      </div>
      <ul className="mt-3 divide-y divide-amber-200/50 dark:divide-amber-400/10">
        {sorted.slice(0, 3).map((action) => (
          <li key={action.id}><Link href={action.href} className="flex items-center justify-between gap-4 rounded py-3 focus-visible:outline-yellow-400">
            <span className="min-w-0"><span className="block truncate text-sm font-medium">{action.taskTitle}</span><span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">{formatHoldDue(action.dueAt, now)}</span></span>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold">{action.label}<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></span>
          </Link></li>
        ))}
        {applicationCount > 0 ? <li><Link href="/my-work" className="flex items-center justify-between gap-3 rounded py-3 text-sm focus-visible:outline-yellow-400"><span>{applicationCount} {applicationCount === 1 ? "application" : "applications"} to review</span><span className="inline-flex items-center gap-1 text-xs font-semibold">Review applications<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></span></Link></li> : null}
      </ul>
    </section>
  );
}
