import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/dashboard/status-chip";
import { verificationLabel } from "@/lib/applications/ui";
import { formatChatTime } from "@/lib/chat/demo";
import type {
  DashboardAction,
  DashboardApplication,
  DashboardAssignment,
  DashboardTask,
} from "@/lib/dashboard/data";
import {
  formatHoldDue,
  formatMoney,
  taskStatusTone,
  verificationTone,
} from "@/lib/dashboard/ui";
import { taskStatusLabel } from "@/lib/tasks/ui";

const linkClass =
  "font-medium text-zinc-800 underline decoration-zinc-300 underline-offset-4 hover:text-[#D19300] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD50D] dark:text-zinc-200 dark:decoration-zinc-700 dark:hover:text-[#FFD50D]";

export function Panel({
  id,
  title,
  description,
  count,
  action,
  children,
}: {
  id: string;
  title: string;
  description: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="scroll-mt-6 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      id={id}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <h2
            className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
            id={`${id}-title`}
          >
            {title}
          </h2>
          {typeof count === "number" ? (
            <span
              aria-label={`${count} ${title.toLowerCase()}`}
              className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-zinc-100 px-2 text-xs font-semibold tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {count}
            </span>
          ) : null}
        </div>
        {action}
      </div>
      <p className="px-5 pt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400 sm:px-6">
        {description}
      </p>
      {children}
    </section>
  );
}

export function EmptyRow({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="px-5 pb-5 pt-3 sm:px-6">
      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">{title}</p>
      <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{children}</p>
    </div>
  );
}

function RowAction({
  href,
  label,
  ariaLabel,
}: {
  href: string;
  label: string;
  ariaLabel: string;
}) {
  return (
    <Button asChild variant="outline">
      <Link aria-label={ariaLabel} href={href}>
        {label}
      </Link>
    </Button>
  );
}

const actionChip: Record<DashboardAction["kind"], string> = {
  complete_payment: "Awaiting payment",
  retry_payment: "Retry needed",
  hold_expired: "Window ended",
};

export function ActionsPanel({
  actions,
  now,
}: {
  actions: DashboardAction[];
  now: Date;
}) {
  return (
    <Panel
      description="Payment holds that block the task until you act."
      id="needs-action"
      title="Needs your attention"
      count={actions.length}
    >
      {actions.length === 0 ? (
        <EmptyRow title="You’re all caught up">No payment holds need you right now.</EmptyRow>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {actions.map((action) => {
            const due = formatHoldDue(action.dueAt, now);
            return (
              <li
                className="flex flex-wrap items-start justify-between gap-3 p-4"
                key={action.id}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    {action.taskTitle}
                  </p>
                  {due ? (
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {due}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip tone={action.tone}>
                    {actionChip[action.kind]}
                  </StatusChip>
                  <RowAction
                    ariaLabel={`${action.label} for ${action.taskTitle}`}
                    href={action.href}
                    label={action.label}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export function ReviewQueue({ rows }: { rows: DashboardApplication[] }) {
  return (
    <Panel
      description="Submitted applications waiting for your decision."
      id="review-queue"
      title="Applications to review"
      count={rows.length}
    >
      {rows.length === 0 ? (
        <EmptyRow title="No applications yet">
          New Tasker offers and requests will show up here.
        </EmptyRow>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {rows.map((row) => (
            <li
              className="flex flex-wrap items-start justify-between gap-3 p-4"
              key={row.id}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  {row.tasker}
                </p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Applied to{" "}
                  <Link className={linkClass} href={row.href}>
                    {row.taskTitle}
                  </Link>
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {formatChatTime(row.createdAt)}
                  {row.amountCents !== null
                    ? ` · ${formatMoney(row.amountCents)}`
                    : " · Fixed price"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip tone={verificationTone(row.verification)}>
                  {verificationLabel(row.verification)}
                </StatusChip>
                <Button asChild variant="outline">
                  <Link
                    aria-label={`Review ${row.tasker}'s application for ${row.taskTitle}`}
                    href={row.href}
                  >
                    Review
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function AssignmentsPanel({ rows }: { rows: DashboardAssignment[] }) {
  return (
    <Panel
      description="Paid work that is currently in progress."
      id="assignments"
      title="Active assignments"
      count={rows.length}
    >
      {rows.length === 0 ? (
        <EmptyRow title="No active assignments">
          Work you’ve hired for or been assigned to will appear here.
        </EmptyRow>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {rows.map((row) => (
            <li
              className="flex flex-wrap items-start justify-between gap-3 p-4"
              key={row.id}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  <Link className={linkClass} href={row.href}>
                    {row.taskTitle}
                  </Link>
                </p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {row.role === "poster"
                    ? `${row.tasker} is assigned`
                    : "Assigned to you"}
                  {row.paidAt ? ` · paid ${formatChatTime(row.paidAt)}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip tone="neutral">
                  {row.role === "poster" ? "As Poster" : "As Tasker"}
                </StatusChip>
                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                  {formatMoney(
                    row.role === "poster" ? row.payoutCents : row.amountCents,
                  )}
                </p>
                <RowAction
                  ariaLabel={`Open ${row.taskTitle}`}
                  href={row.href}
                  label="Open task"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function PostedTasksPanel({
  rows,
  canPost,
}: {
  rows: DashboardTask[];
  canPost: boolean;
}) {
  return (
    <Panel
      description="Every draft, hold, assignment, and cancellation you own."
      id="your-tasks"
      title="Your tasks"
      count={rows.length}
    >
      {rows.length === 0 ? (
        <EmptyRow title={canPost ? "Start with a task" : "No posted tasks yet"}>
          {canPost
            ? "Create a task to describe the work and start receiving offers."
            : "Tasks you post will appear here."}
        </EmptyRow>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {rows.map((row) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 p-4"
              key={row.id}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                  <Link className={linkClass} href={row.href}>
                    {row.title}
                  </Link>
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {row.category} · {formatMoney(row.budgetCents)}
                  {row.awaitingReview > 0
                    ? ` · ${row.awaitingReview} awaiting review`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusChip tone={taskStatusTone(row.status)}>
                  {taskStatusLabel(row.status)}
                </StatusChip>
                <RowAction
                  ariaLabel={`Open ${row.title}`}
                  href={row.href}
                  label="Open"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
