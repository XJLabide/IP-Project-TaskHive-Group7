"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PublicShell } from "@/components/layout/public-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useViewer } from "@/components/viewer/viewer-provider";
import { useMarketplace } from "@/lib/mock-marketplace-store";
import { useMockTasks } from "@/lib/mock-task-store";
import {
  applicationStatusLabel,
  applicationsForTasker,
} from "@/lib/applications/demo";
import { canWithdraw } from "@/lib/applications/rules";
import { applicationStatusClass } from "@/lib/applications/ui";
import { formatChatTime } from "@/lib/chat/demo";
import { requestData } from "@/lib/marketplace/http";
import type { ApplicationView } from "@/lib/applications/service";
import { shouldUseMarketplacePreview } from "@/lib/marketplace/preview";

export function ApplicationTracker() {
  const { isPreview } = useViewer();
  return shouldUseMarketplacePreview(isPreview) ? <DemoApplicationTracker /> : <PersistentApplicationTracker />;
}

function DemoApplicationTracker() {
  const { viewer } = useViewer();
  const { applications, withdraw } = useMarketplace();
  const { tasks } = useMockTasks();
  const [feedback, setFeedback] = useState("");

  const user = viewer.displayName;
  const mine = user ? applicationsForTasker(applications, user) : [];
  const Shell = viewer.signedIn ? AppShell : PublicShell;

  function handleWithdraw(taskId: string, id: string) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || !user) return;
    if (!window.confirm("Withdraw this application? You can apply again while the task is open.")) {
      return;
    }

    const result = withdraw(task, user, id);
    setFeedback(result.ok ? "Application withdrawn." : result.reason);
  }

  return (
    <Shell
      title="My applications"
      description="Every bid and fixed-price request you have sent, with its current state."
    >
      {!viewer.signedIn ? (
        <Card>
          <CardContent className="grid gap-3 p-6">
            <p className="font-semibold">Sign in to track your applications.</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Applications are private to you and the Poster.
            </p>
            <Button asChild className="w-fit" size="sm" variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {feedback ? (
            <p
              aria-live="polite"
              className="mb-4 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300"
              role="status"
            >
              {feedback}
            </p>
          ) : null}

          {mine.length === 0 ? (
            <Card>
              <CardContent className="grid min-h-40 place-items-center p-6 text-center">
                <div>
                  <p className="font-semibold">No applications yet.</p>
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    Bid on a task or request fixed-price work to see it here.
                  </p>
                  <Button asChild className="mt-4" size="sm" variant="outline">
                    <Link href="/tasks">Browse tasks</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {mine.map((application) => {
                const task = tasks.find((item) => item.id === application.taskId);
                const withdrawable =
                  task &&
                  canWithdraw({
                    applicationStatus: application.status,
                    taskStatus: task.status,
                  }).allowed;

                return (
                  <Card key={application.id}>
                    <CardContent className="grid gap-3 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            className="font-bold hover:text-[#D19300] dark:hover:text-[#FFD50D]"
                            href={`/tasks/${application.taskId}`}
                          >
                            {task?.title ?? "Task no longer in this session"}
                          </Link>
                          <Badge className={applicationStatusClass(application.status)}>
                            {applicationStatusLabel(application.status)}
                          </Badge>
                        </div>
                        <p className="text-sm font-bold">
                          {application.amountCents !== null
                            ? `PHP ${(application.amountCents / 100).toFixed(2)}`
                            : "No price"}
                        </p>
                      </div>

                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {application.kind === "bid" ? "Bid" : "Fixed-price request"} ·{" "}
                        {application.tasker} · sent {formatChatTime(application.createdAt)}
                      </p>

                      {application.message ? (
                        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                          {application.message}
                        </p>
                      ) : null}

                      {application.verification !== "verified" ? (
                        <p className="rounded-lg bg-[#FFD50D]/15 px-3 py-2 text-xs leading-5 text-zinc-700 dark:bg-[#FFC800]/10 dark:text-zinc-300">
                          The Poster can see this application, but cannot select you until your
                          identity verification is complete.
                        </p>
                      ) : null}

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                        <span className="text-xs text-zinc-400">
                          {application.status === "withdrawn"
                            ? "Withdrawn applications are kept for history."
                            : "The Poster selects one Tasker manually."}
                        </span>
                        <div className="flex gap-2">
                          {withdrawable ? (
                            <Button
                              onClick={() => handleWithdraw(application.taskId, application.id)}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              Withdraw
                            </Button>
                          ) : null}
                          <Button asChild size="sm" variant="ghost">
                            <Link href={`/tasks/${application.taskId}`}>View task</Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </Shell>
  );
}

function PersistentApplicationTracker() {
  const { viewer } = useViewer();
  const [applications, setApplications] = useState<ApplicationView[] | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const Shell = viewer.signedIn ? AppShell : PublicShell;

  useEffect(() => {
    if (!viewer.signedIn) return;
    const controller = new AbortController();
    void requestData<{ role: string; applications: ApplicationView[] }>("/api/applications", { signal: controller.signal })
      .then((result) => setApplications(result.applications))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load your applications.");
      });
    return () => controller.abort();
  }, [viewer.signedIn]);

  async function withdraw(applicationId: string) {
    if (!window.confirm("Withdraw this application? You can apply again while the task is open.")) return;
    setFeedback("");
    try {
      await requestData(`/api/applications/${encodeURIComponent(applicationId)}`, { method: "DELETE" });
      setApplications((current) => current?.map((application) => application.id === applicationId
        ? { ...application, status: "withdrawn" }
        : application) ?? []);
      setFeedback("Application withdrawn.");
    } catch (reason) {
      setFeedback(reason instanceof Error ? reason.message : "Could not withdraw this application.");
    }
  }

  return (
    <Shell title="My applications" description="Every bid and fixed-price request you have sent, with its current state.">
      {!viewer.signedIn ? <Card><CardContent className="grid gap-3 p-6"><p className="font-semibold">Sign in to track your applications.</p><p className="text-sm text-zinc-500 dark:text-zinc-400">Applications are private to you and the Poster.</p><Button asChild className="w-fit" size="sm" variant="outline"><Link href="/login">Sign in</Link></Button></CardContent></Card> : error ? <Card><CardContent className="p-6"><p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p></CardContent></Card> : applications === null ? <p role="status" className="text-sm text-zinc-500">Loading your applications…</p> : applications.length === 0 ? <Card><CardContent className="grid min-h-40 place-items-center p-6 text-center"><div><p className="font-semibold">No applications yet.</p><p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Bid on a task or request fixed-price work to see it here.</p><Button asChild className="mt-4" size="sm" variant="outline"><Link href="/tasks">Browse tasks</Link></Button></div></CardContent></Card> : (
        <>
          {feedback ? <p aria-live="polite" role="status" className="mb-4 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">{feedback}</p> : null}
          <div className="grid gap-4">{applications.map((application) => {
            const withdrawable = canWithdraw({ applicationStatus: application.status, taskStatus: application.taskStatus }).allowed;
            return <Card key={application.id}><CardContent className="grid gap-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><Link className="font-bold hover:text-[#D19300] dark:hover:text-[#FFD50D]" href={`/tasks/${application.taskId}`}>{application.taskTitle}</Link><Badge className={applicationStatusClass(application.status)}>{applicationStatusLabel(application.status)}</Badge></div><p className="text-sm font-bold">{application.amountCents !== null ? `PHP ${(application.amountCents / 100).toFixed(2)}` : "No price"}</p></div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{application.kind === "bid" ? "Bid" : "Fixed-price request"} · sent {application.createdAt ? formatChatTime(String(application.createdAt)) : "just now"}</p>
              {application.message ? <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{application.message}</p> : null}
              {application.verification !== "verified" ? <p className="rounded-lg bg-[#FFD50D]/15 px-3 py-2 text-xs leading-5 text-zinc-700 dark:bg-[#FFC800]/10 dark:text-zinc-300">The Poster can see this application, but cannot select you until your identity verification is complete.</p> : null}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800"><span className="text-xs text-zinc-400">{application.status === "withdrawn" ? "Withdrawn applications are kept for history." : "The Poster selects one Tasker manually."}</span><div className="flex gap-2">{withdrawable ? <Button onClick={() => void withdraw(application.id)} size="sm" type="button" variant="outline">Withdraw</Button> : null}<Button asChild size="sm" variant="ghost"><Link href={`/tasks/${application.taskId}`}>View task</Link></Button></div></div>
            </CardContent></Card>;
          })}</div>
        </>
      )}
    </Shell>
  );
}
