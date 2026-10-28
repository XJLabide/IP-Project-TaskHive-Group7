"use client";

import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, ClipboardList, ListTodo, Plus } from "lucide-react";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardError, DashboardLoading, DashboardSignedOut } from "@/components/dashboard/states";
import { StatusChip } from "@/components/dashboard/status-chip";
import { useDashboardData } from "@/components/dashboard/use-dashboard-data";
import { Button } from "@/components/ui/button";
import { verificationLabel } from "@/lib/applications/ui";
import { formatChatTime } from "@/lib/chat/demo";
import type {
  DashboardAction,
  DashboardApplication,
  DashboardAssignment,
  DashboardTask,
} from "@/lib/dashboard/data";
import { formatMoney, taskStatusTone, verificationTone } from "@/lib/dashboard/ui";
import { taskStatusLabel } from "@/lib/tasks/ui";

type WorkTab = "tasks" | "review" | "assignments";

type WorkField = {
  label: string;
  value: ReactNode;
};

type WorkRow = {
  id: string;
  title: string;
  href: string;
  subtitle?: string;
  fields: WorkField[];
  action: ReactNode;
};

const tabs: { id: WorkTab; label: string; Icon: typeof ListTodo }[] = [
  { id: "tasks", label: "Tasks", Icon: ListTodo },
  { id: "review", label: "To review", Icon: ClipboardList },
  { id: "assignments", label: "Active assignments", Icon: BriefcaseBusiness },
];

const paymentActionLabel: Record<DashboardAction["kind"], string> = {
  complete_payment: "Complete payment",
  retry_payment: "Retry payment",
  hold_expired: "Review task",
};

function taskRows(tasks: DashboardTask[], actions: DashboardAction[]): WorkRow[] {
  const actionByTask = new Map(actions.map((action) => [action.taskId, action]));

  return tasks.map((task) => {
    const paymentAction = actionByTask.get(task.id);
    return {
      id: task.id,
      title: task.title,
      href: task.href,
      fields: [
        { label: "Category", value: task.category },
        { label: "Budget", value: formatMoney(task.budgetCents) },
        {
          label: "Applications",
          value: `${task.awaitingReview} ${task.awaitingReview === 1 ? "offer" : "offers"}`,
        },
        {
          label: "Status",
          value: <StatusChip tone={taskStatusTone(task.status)}>{taskStatusLabel(task.status)}</StatusChip>,
        },
      ],
      action: paymentAction ? (
        <Button asChild size="sm">
          <Link href={paymentAction.href}>{paymentActionLabel[paymentAction.kind]}</Link>
        </Button>
      ) : (
        <Button asChild size="sm" variant="outline">
          <Link href={task.href}>Open task</Link>
        </Button>
      ),
    };
  });
}

function reviewRows(applications: DashboardApplication[]): WorkRow[] {
  return applications.map((application) => ({
    id: application.id,
    title: application.taskTitle,
    href: application.href,
    fields: [
      { label: "Tasker", value: application.tasker },
      {
        label: "Offer",
        value: application.amountCents === null ? "Fixed price" : formatMoney(application.amountCents),
      },
      {
        label: "Verification",
        value: (
          <StatusChip tone={verificationTone(application.verification)}>
            {verificationLabel(application.verification)}
          </StatusChip>
        ),
      },
      { label: "Received", value: formatChatTime(application.createdAt) },
    ],
    action: (
      <Button asChild size="sm" variant="outline">
        <Link aria-label={`Review ${application.tasker}'s offer for ${application.taskTitle}`} href={application.href}>
          Review
        </Link>
      </Button>
    ),
  }));
}

function assignmentRows(assignments: DashboardAssignment[]): WorkRow[] {
  return assignments.map((assignment) => ({
    id: assignment.id,
    title: assignment.taskTitle,
    href: assignment.href,
    fields: [
      { label: "Your role", value: assignment.role === "poster" ? "Poster" : "Tasker" },
      { label: "Tasker", value: assignment.role === "poster" ? assignment.tasker : "You" },
      { label: "Amount", value: formatMoney(assignment.amountCents) },
      { label: "Paid", value: assignment.paidAt ? formatChatTime(assignment.paidAt) : "Payment complete" },
    ],
    action: (
      <Button asChild size="sm" variant="outline">
        <Link href={assignment.href}>Open task</Link>
      </Button>
    ),
  }));
}

function EmptyState({ tab, canPost }: { tab: WorkTab; canPost: boolean }) {
  const content: Record<WorkTab, { title: string; message: string }> = {
    tasks: {
      title: canPost ? "No tasks posted yet" : "No tasks to show yet",
      message: canPost
        ? "Post a task to collect offers and keep its progress here."
        : "Tasks you post will appear here, along with their offers and status.",
    },
    review: {
      title: "Nothing to review yet",
      message: "New offers on your open tasks will appear here when Taskers apply.",
    },
    assignments: {
      title: "No active assignments yet",
      message: "Work you hire for or accept will appear here while it is in progress.",
    },
  };
  const { title, message } = content[tab];

  return (
    <div className="grid justify-items-center gap-2 px-5 py-14 text-center sm:px-8">
      <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{title}</h3>
      <p className="max-w-md text-sm leading-6 text-zinc-600 dark:text-zinc-400">{message}</p>
      {tab === "tasks" && canPost ? (
        <Button asChild className="mt-2" size="sm">
          <Link href="/tasks/new"><Plus aria-hidden="true" className="h-4 w-4" />Post a task</Link>
        </Button>
      ) : null}
    </div>
  );
}

function WorkTable({ rows, tab, canPost }: { rows: WorkRow[]; tab: WorkTab; canPost: boolean }) {
  if (rows.length === 0) return <EmptyState canPost={canPost} tab={tab} />;

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-950/60 dark:text-zinc-400">
            <tr>
              <th className="px-5 py-3.5 font-semibold sm:px-6" scope="col">Task</th>
              {rows[0].fields.map((field) => (
                <th className="px-4 py-3.5 font-semibold" key={field.label} scope="col">{field.label}</th>
              ))}
              <th className="px-5 py-3.5 text-right font-semibold sm:px-6" scope="col">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {rows.map((row) => (
              <tr className="align-middle hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40" key={row.id}>
                <th className="min-w-48 px-5 py-4 font-medium sm:px-6" scope="row">
                  <Link className="font-semibold text-zinc-950 underline decoration-transparent underline-offset-4 hover:text-[#D19300] hover:decoration-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD50D] dark:text-zinc-50 dark:hover:text-[#FFD50D]" href={row.href}>
                    {row.title}
                  </Link>
                  {row.subtitle ? <span className="mt-1 block text-xs font-normal text-zinc-500 dark:text-zinc-400">{row.subtitle}</span> : null}
                </th>
                {row.fields.map((field) => (
                  <td className="whitespace-nowrap px-4 py-4 text-zinc-700 dark:text-zinc-300" key={field.label}>{field.value}</td>
                ))}
                <td className="whitespace-nowrap px-5 py-4 text-right sm:px-6">{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul aria-label="Work items" className="divide-y divide-zinc-200 md:hidden dark:divide-zinc-800">
        {rows.map((row) => (
          <li className="grid gap-3 p-4 sm:p-5" key={row.id}>
            <div className="min-w-0">
              <Link className="font-semibold text-zinc-950 underline decoration-zinc-300 underline-offset-4 hover:text-[#D19300] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD50D] dark:text-zinc-50 dark:decoration-zinc-700 dark:hover:text-[#FFD50D]" href={row.href}>{row.title}</Link>
              {row.subtitle ? <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{row.subtitle}</p> : null}
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              {row.fields.map((field) => (
                <div className="min-w-0" key={field.label}>
                  <dt className="text-xs text-zinc-500 dark:text-zinc-400">{field.label}</dt>
                  <dd className="mt-0.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">{field.value}</dd>
                </div>
              ))}
            </dl>
            <div>{row.action}</div>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function MyWorkPage() {
  const { viewer, data, state } = useDashboardData();
  const [activeTab, setActiveTab] = useState<WorkTab>("tasks");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const counts: Record<WorkTab, number> = {
    tasks: data.postedTasks.length,
    review: data.awaitingReview.length,
    assignments: data.activeAssignments.length,
  };
  const rowsByTab: Record<WorkTab, WorkRow[]> = {
    tasks: taskRows(data.postedTasks, data.actions),
    review: reviewRows(data.awaitingReview),
    assignments: assignmentRows(data.activeAssignments),
  };
  const tabDescriptions: Record<WorkTab, string> = {
    tasks: "Tasks you posted, with their current status and incoming offers.",
    review: "Compare submitted offers and check verification before choosing.",
    assignments: "Paid work in progress, whether you posted or accepted it.",
  };

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft") nextIndex = (index + tabs.length - 1) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    setActiveTab(tabs[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  }

  const selectedTabIndex = tabs.findIndex((tab) => tab.id === activeTab);
  const selectedTab = tabs[selectedTabIndex];

  return (
    <AppShell
      description="Offers, tasks, assignments, and payment actions tied to your account."
      showHeader={false}
      title="My Work"
    >
      <div className="grid gap-6 sm:gap-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">My Work</h1>
            <p className="mt-2 max-w-3xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
              Manage the tasks you post, offers you review, and assignments in progress.
            </p>
          </div>
          {viewer.canPost ? (
            <Button asChild>
              <Link href="/tasks/new"><Plus aria-hidden="true" className="h-4 w-4" />Post a task</Link>
            </Button>
          ) : (
            <Button asChild variant="outline"><Link href="/tasks">Browse tasks<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></Button>
          )}
        </header>

        {state === "loading" ? <DashboardLoading /> : null}
        {state === "error" ? <DashboardError /> : null}
        {state === "signed_out" ? <DashboardSignedOut /> : null}

        {state === "ready" || state === "empty" ? (
          <section aria-label="Your work" className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div aria-label="My work views" className="flex overflow-x-auto border-b border-zinc-200 px-4 dark:border-zinc-800 sm:px-6" role="tablist">
              {tabs.map(({ id, label, Icon }, index) => {
                const selected = activeTab === id;
                return (
                  <button
                    aria-controls="my-work-panel"
                    aria-selected={selected}
                    className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FFD50D] sm:px-4 ${selected ? "border-[#D19300] text-zinc-950 dark:border-[#FFD50D] dark:text-zinc-50" : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"}`}
                    id={`my-work-tab-${id}`}
                    key={id}
                    onClick={() => setActiveTab(id)}
                    onKeyDown={(event) => handleTabKeyDown(event, index)}
                    ref={(element) => { tabRefs.current[index] = element; }}
                    role="tab"
                    tabIndex={selected ? 0 : -1}
                    type="button"
                  >
                    <Icon aria-hidden="true" className="h-4 w-4" />
                    {label}
                    <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${selected ? "bg-[#FFC800]/20 text-zinc-900 dark:bg-[#FFC800]/15 dark:text-[#FFD50D]" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                      {counts[id]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div aria-labelledby={`my-work-tab-${activeTab}`} className="grid" id="my-work-panel" role="tabpanel" tabIndex={0}>
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
                <div>
                  <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{selectedTab.label}</h2>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{tabDescriptions[activeTab]}</p>
                </div>
                <span className="text-sm tabular-nums text-zinc-500 dark:text-zinc-400">{counts[activeTab]} {counts[activeTab] === 1 ? "item" : "items"}</span>
              </div>
              <WorkTable canPost={viewer.canPost} rows={rowsByTab[activeTab]} tab={activeTab} />
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
