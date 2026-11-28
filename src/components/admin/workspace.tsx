import { AppShell } from "@/components/layout/app-shell";
import { ResolutionForm } from "@/components/admin/resolution-form";
import { UserStatusForm } from "@/components/admin/user-status-form";
import { StatusChip } from "@/components/dashboard/status-chip";
import { formatChatTime } from "@/lib/chat/demo";
import type { SupportOutcome } from "@/lib/support/rules";
import {
  adminActionLabel,
  adminTaskStatusLabel,
  caseStatusTone,
  dueLabel,
  resolutionLabel,
} from "@/lib/support/ui";

import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getAdminSection, getAdminTotals, type AdminPagination } from "@/lib/support/reads";
import { adminPageHref, adminSectionLabels, adminSections, type AdminPages, type AdminSection } from "@/lib/support/pagination";
import { REVIEW_TARGET_BUSINESS_DAYS } from "@/lib/support/rules";
import { VerificationQueue } from "@/components/admin/verification-queue";

type AdminTab = AdminSection | "identityChecks";
const adminTabSections: AdminTab[] = ["recentTasks", "recentUsers", "identityChecks", "cancellations", "disputes", "reports", "verificationAppeals", "recentDecisions"];
const adminTabLabels: Record<AdminTab, string> = { ...adminSectionLabels, identityChecks: "Tasker identity checks" };

function QueueSection({
  title,
  description,
  count,
  section,
  pagination,
  pages,
  children,
}: {
  title: string;
  description: string;
  count: number;
  section: AdminSection;
  pagination: AdminPagination;
  pages: AdminPages;
  children: React.ReactNode;
}) {
  return (
    <section id={section} className="min-w-0 scroll-mt-28 rounded-2xl border border-zinc-200 bg-white p-5 [overflow-wrap:anywhere] dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
        <StatusChip tone={count > 0 ? "pending" : "neutral"}>{count} open</StatusChip>
      </div>
      <Pagination section={section} pagination={pagination} pages={pages} />
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

function Pagination({ section, pagination, pages }: { section: AdminSection; pagination: AdminPagination; pages: AdminPages }) {
  const { page, pageSize, total, totalPages } = pagination;
  if (total === 0) return null;
  return <nav aria-label={`${adminSectionLabels[section]} pages`} className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
    <p className="text-sm tabular-nums text-zinc-600 dark:text-zinc-400">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</p>
    <div className="flex items-center gap-2">
      {page > 1 ? <Button asChild className="h-11 sm:h-9" size="sm" variant="outline"><Link href={adminPaginationHref(section, page - 1, pages)} scroll={false} prefetch={false}>Previous<span className="sr-only"> {adminSectionLabels[section]} page</span></Link></Button> : <Button className="h-11 sm:h-9" disabled size="sm" variant="outline">Previous</Button>}
      {page < totalPages ? <Button asChild className="h-11 sm:h-9" size="sm" variant="outline"><Link href={adminPaginationHref(section, page + 1, pages)} scroll={false} prefetch={false}>Next<span className="sr-only"> {adminSectionLabels[section]} page</span></Link></Button> : <Button className="h-11 sm:h-9" disabled size="sm" variant="outline">Next</Button>}
    </div>
  </nav>;
}

function SectionError({ title, section, pages }: { title: string; section: AdminSection | "totals"; pages: AdminPages }) {
  return <section className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900" role="alert">
    <h2 className="text-lg font-bold">{title} could not load</h2>
    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Other sections are still available. Try loading this workspace again.</p>
    <a className="mt-3 inline-block rounded text-sm font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-[#D19300]" href={adminPaginationHref(section === "totals" ? "cancellations" : section, pages[section as AdminSection] ?? 1, pages)}>Try again</a>
  </section>;
}

function SectionLoading({ title }: { title: string }) {
  return <section className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900" aria-busy="true" role="status">
    <h2 className="text-lg font-bold">{title}</h2><span className="sr-only">Loading {title.toLowerCase()}…</span>
    <div aria-hidden="true" className="mt-4 grid gap-3">{[0,1].map(i => <div key={i} className="h-24 rounded-xl bg-zinc-100 motion-safe:animate-pulse dark:bg-zinc-800" />)}</div>
  </section>;
}

async function CancellationsSection({ pages }: { pages: AdminPages }) {
  let data;
  try { data = await getAdminSection("cancellations", pages.cancellations); }
  catch { return <SectionError title="Cancellation requests" section="cancellations" pages={pages} />; }
  const queue = { cancellations: data.items };
  const now = new Date();
  return (
    <QueueSection
      count={data.pagination.total} section="cancellations" pagination={data.pagination} pages={pages}
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
  );
}

async function DisputesSection({ pages }: { pages: AdminPages }) {
  let data;
  try { data = await getAdminSection("disputes", pages.disputes); }
  catch { return <SectionError title="Completion disputes" section="disputes" pages={pages} />; }
  const queue = { disputes: data.items };
  const now = new Date();
  return (
    <QueueSection
      count={data.pagination.total} section="disputes" pagination={data.pagination} pages={pages}
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
  );
}

async function ReportsSection({ pages }: { pages: AdminPages }) {
  let data;
  try { data = await getAdminSection("reports", pages.reports); }
  catch { return <SectionError title="Reports" section="reports" pages={pages} />; }
  const queue = { reports: data.items };
  const now = new Date();
  return (
    <QueueSection
      count={data.pagination.total} section="reports" pagination={data.pagination} pages={pages}
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
  );
}

async function VerificationAppealsSection({ pages }: { pages: AdminPages }) {
  let data;
  try { data = await getAdminSection("verificationAppeals", pages.verificationAppeals); }
  catch { return <SectionError title="Verification appeals" section="verificationAppeals" pages={pages} />; }
  const queue = { verificationAppeals: data.items };
  const now = new Date();
  return (
    <QueueSection
      count={data.pagination.total} section="verificationAppeals" pagination={data.pagination} pages={pages}
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
  );
}

async function RecentTasksSection({ pages }: { pages: AdminPages }) {
  let data;
  try { data = await getAdminSection("recentTasks", pages.recentTasks); }
  catch { return <SectionError title="Recent tasks" section="recentTasks" pages={pages} />; }
  const queue = { recentTasks: data.items };
  return (<section id="recentTasks" className="min-w-0 scroll-mt-28 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-bold tracking-tight">Recent tasks</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Basic task oversight from the live marketplace.
              </p>
              <Pagination section="recentTasks" pagination={data.pagination} pages={pages} />
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
            </section>);
}

async function RecentUsersSection({ pages }: { pages: AdminPages }) {
  let data;
  try { data = await getAdminSection("recentUsers", pages.recentUsers); }
  catch { return <SectionError title="Users" section="recentUsers" pages={pages} />; }
  const queue = { recentUsers: data.items };
  return (<section id="recentUsers" className="min-w-0 scroll-mt-28 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-bold tracking-tight">Users</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Suspend or reinstate non-Admin accounts. Every change is audited.
              </p>
              <Pagination section="recentUsers" pagination={data.pagination} pages={pages} />
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
            </section>);
}

async function RecentDecisionsSection({ pages }: { pages: AdminPages }) {
  let data;
  try { data = await getAdminSection("recentDecisions", pages.recentDecisions); }
  catch { return <SectionError title="Recent decisions" section="recentDecisions" pages={pages} />; }
  const queue = { recentDecisions: data.items };
  return (<section id="recentDecisions" className="min-w-0 scroll-mt-28 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-lg font-bold tracking-tight">Recent decisions</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                The audited Admin trail, newest first.
              </p>
              <Pagination section="recentDecisions" pagination={data.pagination} pages={pages} />
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
            </section>);
}

async function TotalsSection({ pages }: { pages: AdminPages }) {
  let totals;
  try { totals = await getAdminTotals(); }
  catch { return <SectionError title="Marketplace totals" section="totals" pages={pages} />; }
  return (<section aria-label="Marketplace totals" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            ["Users", totals.users],
            ["Tasks", totals.tasks],
            ["Completed", totals.completedTasks],
            ["Open reports", totals.openReports],
            ["Open disputes", totals.openDisputes],
            ["Open cancellations", totals.openCancellations],
            ["Pending appeals", totals.pendingVerificationAppeals],
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
        </section>);
}
function adminSectionHref(section: AdminTab, pages: AdminPages) {
  const params = new URLSearchParams();
  for (const name of adminSections) {
    const page = pages[name] ?? 1;
    if (page > 1) params.set(`${name}Page`, String(page));
  }
  params.set("section", section);
  return `/admin?${params.toString()}#${section}`;
}

function adminPaginationHref(section: AdminSection, page: number, pages: AdminPages) {
  const href = adminPageHref(section, page, pages);
  const [path, anchor] = href.split("#");
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}section=${section}${anchor ? `#${anchor}` : ""}`;
}

export function AdminWorkspace({ pages = {}, activeSection = "recentTasks" }: { pages?: AdminPages; activeSection?: AdminTab }) {
  const queuePanels: Record<AdminSection, React.ReactNode> = {
    cancellations: <Suspense key={`cancellations-${pages.cancellations ?? 1}`} fallback={<SectionLoading title="Cancellation requests" />}><CancellationsSection pages={pages} /></Suspense>,
    disputes: <Suspense key={`disputes-${pages.disputes ?? 1}`} fallback={<SectionLoading title="Completion disputes" />}><DisputesSection pages={pages} /></Suspense>,
    reports: <Suspense key={`reports-${pages.reports ?? 1}`} fallback={<SectionLoading title="Reports" />}><ReportsSection pages={pages} /></Suspense>,
    verificationAppeals: <Suspense key={`verificationAppeals-${pages.verificationAppeals ?? 1}`} fallback={<SectionLoading title="Verification appeals" />}><VerificationAppealsSection pages={pages} /></Suspense>,
    recentTasks: <Suspense key={`recentTasks-${pages.recentTasks ?? 1}`} fallback={<SectionLoading title="Recent tasks" />}><RecentTasksSection pages={pages} /></Suspense>,
    recentUsers: <Suspense key={`recentUsers-${pages.recentUsers ?? 1}`} fallback={<SectionLoading title="Users" />}><RecentUsersSection pages={pages} /></Suspense>,
    recentDecisions: <Suspense key={`recentDecisions-${pages.recentDecisions ?? 1}`} fallback={<SectionLoading title="Recent decisions" />}><RecentDecisionsSection pages={pages} /></Suspense>,
  };

  return (
    <AppShell description="Support queues, decisions, and marketplace oversight from real records." title="Global Admin">
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
            disputes target review within {REVIEW_TARGET_BUSINESS_DAYS} business days.
          </p>
        </section>
        <Suspense fallback={<SectionLoading title="Marketplace totals" />}>
          <TotalsSection pages={pages} />
        </Suspense>
        <nav aria-label="Admin sections" className="flex gap-1 overflow-x-auto border-b border-zinc-200 pb-px dark:border-zinc-800">
          {adminTabSections.map((section) => (
            <Link
              aria-current={activeSection === section ? "page" : undefined}
              className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD50D] ${activeSection === section ? "border-[#D19300] text-zinc-950 dark:border-[#FFD50D] dark:text-zinc-50" : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"}`}
              href={adminSectionHref(section, pages)}
              key={section}
              prefetch={false}
              scroll={false}
            >
              {adminTabLabels[section]}
            </Link>
          ))}
        </nav>
        <div aria-label={adminTabLabels[activeSection]} className="min-w-0">
          {activeSection === "identityChecks" ? <VerificationQueue /> : queuePanels[activeSection]}
        </div>
      </div>
    </AppShell>
  );
}
