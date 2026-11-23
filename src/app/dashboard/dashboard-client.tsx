"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, CircleDollarSign, ClipboardList, MessageSquare, Wallet } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { useViewer } from "@/components/viewer/viewer-provider";
import { useDemoDashboardData } from "@/components/dashboard/use-dashboard-data";
import { usePersistentDashboardData } from "@/components/dashboard/use-persistent-dashboard-data";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { StatusChip } from "@/components/dashboard/status-chip";
import { VerificationCard } from "@/components/viewer/verification-card";
import { GettingStarted } from "@/components/dashboard/getting-started";
import { TaskFeedEmpty } from "@/components/dashboard/task-feed-empty";
import { Button } from "@/components/ui/button";
import { formatMoney, taskStatusTone } from "@/lib/dashboard/ui";
import { taskStatusLabel } from "@/lib/tasks/ui";
import type { DashboardActivity, DashboardAssignment, DashboardTask } from "@/lib/dashboard/data";
import { shouldUseMarketplacePreview } from "@/lib/marketplace/preview";

type Role = "all" | "poster" | "worker";

export default function DashboardClient({ developmentPreview = false }: { developmentPreview?: boolean }) {
  const { isPreview } = useViewer();
  return developmentPreview || shouldUseMarketplacePreview(isPreview) ? <DemoDashboard /> : <PersistentDashboard />;
}

function DemoDashboard() {
  return <DashboardContent data={useDemoDashboardData()} />;
}

function PersistentDashboard() {
  return <DashboardContent data={usePersistentDashboardData()} />;
}

function DashboardContent({ data }: { data: ReturnType<typeof useDemoDashboardData> & { retry?: () => void } }) {
  const { viewer, data: dashboard, state } = data;
  const [role, setRole] = useState<Role>("all");
  const canSwitchRole = viewer.isAdmin || (viewer.canPost && viewer.canApply && viewer.canChat && viewer.canBeAssigned);
  const activeRole = canSwitchRole ? role : "all";
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadLoaded, setUnreadLoaded] = useState(false);
  const { startVerification, submitAppeal } = useViewer();

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/notifications", { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        if (controller.signal.aborted) return;
        setUnreadMessages(Number(payload.data?.unreadMessageCount ?? 0));
        setUnreadLoaded(true);
      })
      .catch(() => { if (!controller.signal.aborted) setUnreadLoaded(true); });
    return () => controller.abort();
  }, []);

  const posterTasks = dashboard.postedTasks;
  const workerAssignments = dashboard.activeAssignments.filter((item) => item.role === "tasker");
  const visibleTasks = activeRole === "poster" ? posterTasks : activeRole === "worker" ? [] : posterTasks;
  const visibleAssignments = activeRole === "poster" ? dashboard.activeAssignments.filter((item) => item.role === "poster") : activeRole === "worker" ? workerAssignments : dashboard.activeAssignments;
  const visibleActions = activeRole === "worker" ? [] : dashboard.actions;
  const visibleApplications = activeRole === "worker" ? [] : dashboard.awaitingReview;
  const messages = dashboard.activity.filter((item) => item.kind === "message").slice(0, 4);
  const activeCount = (activeRole === "worker" ? workerAssignments.length : posterTasks.filter((task) => task.status === "open" || task.status === "assigned" || task.status === "pending_payment").length) + (activeRole === "poster" ? 0 : workerAssignments.length);
  const pendingCount = (activeRole === "worker" ? 0 : dashboard.awaitingReview.length) + (activeRole === "poster" ? 0 : dashboard.activity.filter((item) => item.kind === "application_submitted" && item.role === "tasker").length);
  const earningsCents = (activeRole === "poster" ? [] : workerAssignments).reduce((sum, item) => sum + item.payoutCents, 0);
  const feed = buildFeed(visibleTasks, visibleAssignments, visibleActions, visibleApplications, dashboard.activity);

  return (
    <AppShell description="Your tasks, applications, messages, and earnings in one place." showHeader={false} showMobilePrimaryAction={false} title="Dashboard">
      <div className="grid gap-6 sm:gap-8">
        <header className="flex flex-col gap-5 border-b border-zinc-200 pb-6 dark:border-zinc-800 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B77900] dark:text-[#FFD50D]">Your workspace</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Good to see you, {viewer.displayName?.split(" ")[0] ?? "there"}.</h1><p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Keep your local work moving from one clear view.</p></div>
          <div className="flex flex-col gap-3 sm:items-end"><Button asChild><Link href={viewer.canPost ? "/tasks/new" : "/profile"}><span aria-hidden="true" className="text-lg leading-none">+</span>{viewer.canPost ? "Post a Task" : "Complete your profile"}</Link></Button>{canSwitchRole && <div aria-label="Dashboard role filter" className="inline-flex w-fit rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900" role="group">{([ ["all", "All Activity"], ["poster", "As Poster"], ["worker", "As Worker"] ] as const).map(([value, label]) => <button aria-pressed={activeRole === value} className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${activeRole === value ? "bg-[#FFC800] text-zinc-950" : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"}`} key={value} onClick={() => setRole(value)} type="button">{label}</button>)}</div>}</div>
        </header>

        <GettingStarted viewer={viewer} />

        <section aria-label="Dashboard summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric icon={ClipboardList} label="Active tasks" value={String(activeCount)} detail="Posted and in progress" href="#task-feed" />
          <Metric icon={BriefcaseBusiness} label="Pending bids" value={String(pendingCount)} detail="Offers awaiting a decision" href="#task-feed" />
          <Metric icon={MessageSquare} label="Unread messages" value={unreadLoaded ? String(unreadMessages) : "—"} detail="Messages that need a reply" href="/notifications" />
          <Metric icon={Wallet} label="Escrow / earnings" value={formatMoney(earningsCents)} detail="Your active worker earnings" href="/checkout" />
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.85fr)_minmax(18rem,1fr)]">
          <section aria-labelledby="task-feed-title" className="min-w-0" id="task-feed">
            <div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-xl font-bold tracking-tight" id="task-feed-title">Your task feed</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">The next action for each task is ready when you are.</p></div><Link className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-700 hover:text-[#B77900] dark:text-zinc-300" href="/my-work">All work<ArrowUpRight aria-hidden="true" className="h-4 w-4" /></Link></div>
            {state === "loading" ? <FeedSkeleton /> : state === "error" ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-900" role="alert"><p>Your dashboard data could not load. Check your connection and try again.</p><Button onClick={() => data.retry ? data.retry() : window.location.reload()} size="sm" type="button" variant="outline">Try again</Button></div> : feed.length === 0 ? <TaskFeedEmpty hasAnyActivity={dashboard.scope === "ready"} role={activeRole} viewer={viewer} /> : <ul className="grid gap-3">{feed.map((item) => <li className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5" key={item.id}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold"><Link className="hover:underline" href={item.href}>{item.title}</Link></h3><StatusChip tone={item.tone}>{item.status}</StatusChip>{item.role && <span className="text-xs text-zinc-500 dark:text-zinc-400">As {item.role === "poster" ? "Poster" : "Worker"}</span>}</div><p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{item.detail}</p></div><Button asChild size="sm" variant={item.primary ? "default" : "outline"}><Link href={item.href}>{item.action}</Link></Button></div></li>)}</ul>}
          </section>

          <aside aria-label="Trust and recent messages" className="grid gap-4">
            <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-4 flex items-center gap-2"><CircleDollarSign aria-hidden="true" className="h-5 w-5 text-[#B77900] dark:text-[#FFD50D]" /><h2 className="font-semibold">Trust & verification</h2></div>
              {viewer.missingProfileFields.includes("18+ attestation") ? <div className="mb-4 rounded-lg border border-amber-300/70 bg-amber-50 p-3 text-sm dark:border-amber-300/20 dark:bg-amber-400/10"><p className="font-semibold">Confirm you’re 18 or older</p><p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-300">Complete your profile before posting or applying.</p><Link className="mt-2 inline-flex text-sm font-semibold underline underline-offset-4" href="/profile">Complete profile</Link></div> : null}
              <VerificationCard viewer={viewer} onStartVerification={startVerification} onSubmitAppeal={submitAppeal} />
            </section>
            <section aria-labelledby="recent-messages-title" className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800"><div><h2 className="font-semibold" id="recent-messages-title">Recent messages</h2><p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Task conversations, latest first</p></div><Link aria-label="Open chat inbox" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" href="/chats"><MessageSquare aria-hidden="true" className="h-4 w-4" /></Link></div>
              {messages.length ? <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">{messages.map((message) => <li key={message.id}><Link className="block p-4 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD50D] focus-visible:ring-inset dark:hover:bg-zinc-800/50" href={message.href}><p className="line-clamp-2 text-sm leading-5">{message.description}</p><p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">{message.taskTitle}</p></Link></li>)}</ul> : <p className="p-5 text-sm text-zinc-500 dark:text-zinc-400">Your task messages will appear here.</p>}
              <Link className="block border-t border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-700 hover:text-[#B77900] dark:border-zinc-800 dark:text-zinc-300" href="/chats">Open inbox <span aria-hidden="true">→</span></Link>
            </section>
            <ActivityFeed items={dashboard.activity.slice(0, 3)} />
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function Metric({ icon: Icon, label, value, detail, href }: { icon: typeof ClipboardList; label: string; value: string; detail: string; href: string }) {
  return <Link className="rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-[#D19300] dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-[#FFD50D] sm:p-5" href={href}><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p><Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#B77900] dark:text-[#FFD50D]" /></div><p className="mt-3 truncate text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">{value}</p><p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{detail}</p></Link>;
}

type FeedItem = { id: string; title: string; href: string; status: string; tone: "positive" | "pending" | "negative" | "neutral"; detail: string; action: string; primary?: boolean; role?: "poster" | "tasker" };

function buildFeed(tasks: DashboardTask[], assignments: DashboardAssignment[], actions: ReturnType<typeof useDemoDashboardData>["data"]["actions"], applications: ReturnType<typeof useDemoDashboardData>["data"]["awaitingReview"], activity: DashboardActivity[]): FeedItem[] {
  const items: FeedItem[] = [];
  for (const action of actions) items.push({ id: `action-${action.id}`, title: action.taskTitle, href: action.href, status: action.kind === "hold_expired" ? "Payment hold expired" : "Awaiting Payment", tone: action.tone, detail: action.kind === "hold_expired" ? "The payment window ended. Review this task and choose what to do next." : "The selected Tasker is reserved. Complete payment to activate the assignment.", action: action.kind === "hold_expired" ? "Review task" : "Pay now", primary: true, role: "poster" });
  for (const task of tasks) {
    const hasAssignment = assignments.some((item) => item.taskId === task.id);
    if (hasAssignment || actions.some((item) => item.taskId === task.id)) continue;
    const taskApplications = applications.filter((item) => item.taskId === task.id).length;
    const awaitingConfirmation = task.status === "awaiting_confirmation";
    const status = task.assignmentStatus === "pending_payment" ? "Awaiting Payment" : awaitingConfirmation ? "Review Completion" : task.status === "assigned" || task.status === "in_progress" ? "In Progress" : taskStatusLabel(task.status);
    const tone = task.assignmentStatus === "pending_payment" ? "pending" : taskStatusTone(task.status);
    const href = task.assignmentStatus === "pending_payment" ? `/checkout?taskId=${encodeURIComponent(task.id)}` : task.href;
    const nextStep = task.assignmentStatus === "pending_payment" ? "Payment is needed to activate the assignment." : awaitingConfirmation ? "The Tasker submitted completion. Review it to release payout." : task.status === "assigned" || task.status === "in_progress" ? "Your Tasker is working. Message them if you need an update." : task.status === "completed" ? "Task complete. Review the payout and leave feedback." : taskApplications ? `${taskApplications} offer${taskApplications === 1 ? "" : "s"} ready for your review.` : task.status === "open" ? "Waiting for offers. You can review or update the task." : `${task.category} · ${formatMoney(task.budgetCents)}`;
    const action = task.assignmentStatus === "pending_payment" ? "Pay now" : awaitingConfirmation ? "Review completion" : task.status === "assigned" || task.status === "in_progress" ? "Message Worker" : task.status === "completed" ? "View payout" : taskApplications ? `Review ${taskApplications} ${taskApplications === 1 ? "Bid" : "Bids"}` : task.status === "open" ? "Manage task" : "View task";
    items.push({ id: `task-${task.id}`, title: task.title, href, status, tone, detail: nextStep, action, primary: Boolean(taskApplications || hasAssignment || task.assignmentStatus === "pending_payment" || awaitingConfirmation), role: "poster" });
  }
  for (const assignment of assignments) {
    const awaitingConfirmation = assignment.taskStatus === "awaiting_confirmation";
    const completed = assignment.taskStatus === "completed";
    const status = taskStatusLabel(assignment.taskStatus);
    const detail = awaitingConfirmation
      ? assignment.role === "poster" ? "The Tasker submitted completion. Review the work to release payout." : "Your completion was submitted. The Poster is reviewing it; payout remains held."
      : completed
        ? `Task complete. ${assignment.role === "tasker" ? `Payout: ${formatMoney(assignment.payoutCents)}.` : "Review the payout and leave feedback."}`
        : assignment.role === "poster"
          ? `${assignment.tasker} is working on this task. Message them with questions or updates.`
          : `Your work is active. Expected payout: ${formatMoney(assignment.payoutCents)}.`;
    const action = awaitingConfirmation ? assignment.role === "poster" ? "Review completion" : "View submission" : completed ? "View payout" : assignment.role === "poster" ? "Message Worker" : "Open task";
    items.push({ id: `assignment-${assignment.id}`, title: assignment.taskTitle, href: assignment.href, status, tone: completed ? "positive" : awaitingConfirmation ? "pending" : "positive", detail, action, primary: true, role: assignment.role });
  }
  for (const item of activity) {
    if (item.kind !== "application_submitted" || item.role !== "tasker") continue;
    items.push({ id: `application-${item.id}`, title: item.taskTitle, href: item.href, status: "Application sent", tone: "pending", detail: "You’re waiting for the Poster to review your offer.", action: "View task", role: "tasker" });
  }
  for (const item of activity) {
    if (item.kind !== "message") continue;
    items.push({ id: `message-${item.id}`, title: item.taskTitle, href: item.href, status: "Conversation", tone: "neutral", detail: item.description, action: "Open chat", role: item.role });
  }
  return items.slice(0, 8);
}

function FeedSkeleton() {
  return <div aria-busy="true" className="grid gap-3" role="status"><span className="sr-only">Loading your task feed…</span>{Array.from({ length: 4 }, (_, index) => <div aria-hidden="true" className="h-24 animate-pulse rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" key={index} />)}</div>;
}
