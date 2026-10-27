import { AppShell } from "@/components/layout/app-shell";
import { ResolutionForm } from "@/components/admin/resolution-form";
import { UserStatusForm } from "@/components/admin/user-status-form";
import { StatusChip } from "@/components/dashboard/status-chip";
import { formatChatTime } from "@/lib/chat/demo";
import { listSupportQueue } from "@/lib/support/service";
import type { SupportOutcome } from "@/lib/support/rules";
import {
  adminActionLabel,
  adminTaskStatusLabel,
  caseStatusTone,
  dueLabel,
  resolutionLabel,
} from "@/lib/support/ui";

export const runtime = "nodejs";

function QueueSection({
  title,
  description,
  count,
  children,
}: {
  title: string;
  description: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
        <StatusChip tone={count > 0 ? "pending" : "neutral"}>{count} open</StatusChip>
      </div>
      <div className="mt-4 grid gap-3">{children}</div>
    </section>
  );
}

function EmptyQueue({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
      {children}
    </p>
  );
}

export default async function AdminPage() {
  const queue = await listSupportQueue();
  const now = new Date();

  return (
    <AppShell
      description="Support queues, decisions, and marketplace oversight from real records."
      title="Global Admin"
    >
      <div className="grid gap-6">
        <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#7a5900] dark:text-[#FFD50D]">
            Operations overview
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">
            Keep TaskHive safe, fair, and moving.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Every decision below is recorded in the Admin audit trail. Cancellations and
            disputes target review within {queue.reviewTargetBusinessDays} business days.
          </p>
        </section>

        <section aria-label="Marketplace totals" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            ["Users", queue.totals.users],
            ["Tasks", queue.totals.tasks],
            ["Completed", queue.totals.completedTasks],
            ["Open reports", queue.totals.openReports],
            ["Open disputes", queue.totals.openDisputes],
            ["Open cancellations", queue.totals.openCancellations],
            ["Pending appeals", queue.totals.pendingVerificationAppeals],
          ].map(([label, value]) => (
            <div
              className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              key={label}
            >
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {label}
              </p>
            </div>
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid content-start gap-6">
            <QueueSection
              count={queue.cancellations.length}
              description="Post-hire requests that pause work and payout."
              title="Cancellation requests"
            >
              {queue.cancellations.length === 0 ? (
                <EmptyQueue>No cancellation requests are waiting.</EmptyQueue>
              ) : (
                queue.cancellations.map((request) => {
                  const due = dueLabel(request.dueAt, now);
                  return (
                    <article
                      className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
                      key={request.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{request.taskTitle}</p>
                          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            Requested by {request.requestedBy} · {formatChatTime(request.createdAt.toISOString())}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusChip tone={caseStatusTone(request.status)}>
                            {request.status}
                          </StatusChip>
                          <span className={due.overdue ? "text-xs font-semibold text-[#a01a26] dark:text-[#F04452]" : "text-xs text-zinc-500 dark:text-zinc-400"}>
                            {due.text}
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                        {request.reason}
                      </p>
                      {request.evidenceNote ? (
                        <p className="mt-1 rounded-lg bg-zinc-50 p-2 text-xs leading-5 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
                          Completion evidence: {request.evidenceNote}
                        </p>
                      ) : null}
                      {request.evidenceUrl ? (
                        <a
                          className="mt-1 inline-block break-all text-xs font-medium text-[#D19300] underline underline-offset-4 dark:text-[#FFD50D]"
                          href={request.evidenceUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Open submitted evidence
                        </a>
                      ) : null}
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-semibold text-[#7a5900] dark:text-[#FFD50D]">
                          Decide cancellation
                        </summary>
                        <ResolutionForm id={request.id} kind="cancellation" />
                      </details>
                    </article>
                  );
                })
              )}
            </QueueSection>

            <QueueSection
              count={queue.disputes.length}
              description="Completion disputes that freeze the payout until resolved."
              title="Completion disputes"
            >
              {queue.disputes.length === 0 ? (
                <EmptyQueue>No completion disputes are waiting.</EmptyQueue>
              ) : (
                queue.disputes.map((dispute) => {
                  const due = dueLabel(dispute.dueAt, now);
                  return (
                    <article
                      className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
                      key={dispute.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{dispute.taskTitle}</p>
                          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            Opened by {dispute.openedBy} · {formatChatTime(dispute.createdAt.toISOString())}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusChip tone={caseStatusTone(dispute.status)}>
                            {dispute.status}
                          </StatusChip>
                          <span className={due.overdue ? "text-xs font-semibold text-[#a01a26] dark:text-[#F04452]" : "text-xs text-zinc-500 dark:text-zinc-400"}>
                            {due.text}
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                        {dispute.reason}
                      </p>
                      {dispute.evidenceNote ? (
                        <p className="mt-1 rounded-lg bg-zinc-50 p-2 text-xs leading-5 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
                          Completion evidence: {dispute.evidenceNote}
                        </p>
                      ) : null}
                      {dispute.evidenceUrl ? (
                        <a
                          className="mt-1 inline-block break-all text-xs font-medium text-[#D19300] underline underline-offset-4 dark:text-[#FFD50D]"
                          href={dispute.evidenceUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Open submitted evidence
                        </a>
                      ) : null}
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-semibold text-[#7a5900] dark:text-[#FFD50D]">
                          Decide dispute
                        </summary>
                        <ResolutionForm id={dispute.id} kind="dispute" />
                      </details>
                    </article>
                  );
                })
              )}
            </QueueSection>

            <QueueSection
              count={queue.reports.length}
              description="Reported messages. Reports never release or refund a payout."
              title="Reports"
            >
              {queue.reports.length === 0 ? (
                <EmptyQueue>No reports are waiting.</EmptyQueue>
              ) : (
                queue.reports.map((report) => {
                  const due = dueLabel(report.dueAt, now);
                  return (
                    <article
                      className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
                      key={report.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">
                            {report.reporter}
                            {report.reportedUser ? ` → ${report.reportedUser}` : ""}
                          </p>
                          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            {report.taskTitle ?? "No task"} · {formatChatTime(report.createdAt.toISOString())}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusChip tone={caseStatusTone(report.status)}>
                            {report.status}
                          </StatusChip>
                          <span className={due.overdue ? "text-xs font-semibold text-[#a01a26] dark:text-[#F04452]" : "text-xs text-zinc-500 dark:text-zinc-400"}>
                            {due.text}
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                        {report.reason}
                      </p>
                      {report.messageBody ? (
                        <blockquote className="mt-1 border-l-2 border-zinc-300 pl-3 text-xs italic leading-5 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                          “{report.messageBody}”
                        </blockquote>
                      ) : null}
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-semibold text-[#7a5900] dark:text-[#FFD50D]">
                          Decide report
                        </summary>
                        <ResolutionForm id={report.id} kind="report" />
                      </details>
                    </article>
                  );
                })
              )}
            </QueueSection>

            <QueueSection
              count={queue.verificationAppeals.length}
              description="One appeal per rejected Tasker, reviewed by an Admin."
              title="Verification appeals"
            >
              {queue.verificationAppeals.length === 0 ? (
                <EmptyQueue>No verification appeals are waiting.</EmptyQueue>
              ) : (
                queue.verificationAppeals.map((appeal) => {
                  const due = dueLabel(appeal.dueAt, now);
                  return (
                    <article
                      className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
                      key={appeal.userId}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{appeal.name}</p>
                          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            {appeal.appealedAt ? formatChatTime(appeal.appealedAt.toISOString()) : "Appeal submitted"}
                          </p>
                        </div>
                        <span className={due.overdue ? "text-xs font-semibold text-[#a01a26] dark:text-[#F04452]" : "text-xs text-zinc-500 dark:text-zinc-400"}>
                          {due.text}
                        </span>
                      </div>
                      {appeal.appealNote ? (
                        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                          {appeal.appealNote}
                        </p>
                      ) : null}
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-semibold text-[#7a5900] dark:text-[#FFD50D]">
                          Decide appeal
                        </summary>
                        <ResolutionForm id={appeal.userId} kind="verification" />
                      </details>
                    </article>
                  );
                })
              )}
            </QueueSection>
          </div>

          <aside className="grid content-start gap-6">
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-bold tracking-tight">Recent tasks</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Basic task oversight from the live marketplace.
              </p>
              {queue.recentTasks.length === 0 ? (
                <EmptyQueue>No tasks yet.</EmptyQueue>
              ) : (
                <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
                  {queue.recentTasks.map((task) => (
                    <li className="py-3" key={task.id}>
                      <p className="text-sm font-semibold">{task.title}</p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {task.poster} · {adminTaskStatusLabel(task.status)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-bold tracking-tight">Users</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Suspend or reinstate non-Admin accounts. Every change is audited.
              </p>
              {queue.recentUsers.length === 0 ? (
                <EmptyQueue>No users yet.</EmptyQueue>
              ) : (
                <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
                  {queue.recentUsers.map((user) => (
                    <li className="grid gap-2 py-3" key={user.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{user.name}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {user.isAdmin ? "Admin" : "Participant"} · {user.status}
                          </p>
                        </div>
                        {!user.isAdmin ? (
                          <UserStatusForm status={user.status} userId={user.id} />
                        ) : (
                          <StatusChip tone="neutral">Managed separately</StatusChip>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-bold tracking-tight">Recent decisions</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                The audited Admin trail, newest first.
              </p>
              {queue.recentDecisions.length === 0 ? (
                <EmptyQueue>No decisions recorded yet.</EmptyQueue>
              ) : (
                <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
                  {queue.recentDecisions.map((decision) => (
                    <li className="py-3" key={decision.id}>
                      <p className="text-sm font-semibold">
                        {adminActionLabel(decision.action)}
                        {typeof decision.metadata?.outcome === "string"
                          ? ` · ${resolutionLabel(decision.metadata.outcome as SupportOutcome)}`
                          : ""}
                        {typeof decision.metadata?.payoutCents === "number"
                          ? ` · PHP ${(decision.metadata.payoutCents / 100).toFixed(2)}`
                          : ""}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {decision.admin} · {decision.targetType} ·{" "}
                        {formatChatTime(decision.createdAt.toISOString())}
                      </p>
                      {decision.notes ? (
                        <p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
                          {decision.notes}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
