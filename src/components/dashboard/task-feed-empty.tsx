import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ViewerSnapshot } from "@/lib/viewer/presentation";

export type DashboardRoleView = "all" | "poster" | "worker";

export function TaskFeedEmpty({
  role,
  viewer,
  hasAnyActivity,
}: {
  role: DashboardRoleView;
  viewer: ViewerSnapshot;
  hasAnyActivity: boolean;
}) {
  if (role === "poster") {
    return (
      <EmptyPanel icon={BriefcaseBusiness} title="No tasks posted yet">
        <p>When you need help, post a task and review local offers here.</p>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {viewer.canPost ? "Use Post a Task above to get started." : "Complete your profile above to unlock posting."}
        </p>
        <Button asChild className="mt-4" size="sm">
          <Link href={viewer.canPost ? "/tasks/new" : "/profile"}>{viewer.canPost ? "Post a Task" : "Complete profile"}</Link>
        </Button>
      </EmptyPanel>
    );
  }

  if (role === "worker") {
    return (
      <EmptyPanel icon={Search} title="No work activity yet">
        <p>Browse local tasks and apply to work that fits your skills and schedule.</p>
        <Button asChild className="mt-4" size="sm" variant="outline">
          <Link href="/tasks">Browse tasks <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
        </Button>
      </EmptyPanel>
    );
  }

  if (hasAnyActivity) {
    return (
      <EmptyPanel icon={BriefcaseBusiness} title="Nothing needs action right now">
        <p>Your work and recent conversations are up to date.</p>
        <Link className="mt-3 inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4" href="/my-work">
          Review all your work <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </EmptyPanel>
    );
  }

  return (
    <section aria-labelledby="empty-dashboard-title" className="rounded-xl border border-dashed border-zinc-300 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900 sm:p-6">
      <div className="max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9A6500] dark:text-[#FFD50D]">Your first step</p>
        <h3 className="mt-1 text-lg font-bold" id="empty-dashboard-title">What would you like to do?</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Use one account to get help with a task or find local work.</p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="font-semibold">Need a hand?</p>
          <p className="mt-1 text-sm leading-5 text-zinc-500 dark:text-zinc-400">Describe an errand or task and local Taskers can send offers.</p>
          <Button asChild className="mt-3" size="sm" variant="outline"><Link href={viewer.canPost ? "/tasks/new" : "/profile"}>{viewer.canPost ? "Post a Task" : "Complete profile"}</Link></Button>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="font-semibold">Looking for work?</p>
          <p className="mt-1 text-sm leading-5 text-zinc-500 dark:text-zinc-400">Explore nearby tasks and apply when you find a good fit.</p>
          <Button asChild className="mt-3" size="sm" variant="outline">
            <Link href="/tasks">Browse tasks <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Search;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-100 text-[#835700] dark:bg-amber-400/10 dark:text-[#FFD50D]"><Icon aria-hidden="true" className="h-4 w-4" /></span>
        <div className="min-w-0"><h3 className="font-semibold">{title}</h3><div className="mt-1 text-sm leading-5 text-zinc-600 dark:text-zinc-400">{children}</div></div>
      </div>
    </div>
  );
}
