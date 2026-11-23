"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMarketplace } from "@/lib/mock-marketplace-store";
import { useMockTasks } from "@/lib/mock-task-store";
import {
  applicationStatusLabel,
  approvalFor,
  type DemoApplication,
} from "@/lib/applications/demo";
import {
  applicationStatusClass,
  verificationClass,
  verificationLabel,
} from "@/lib/applications/ui";
import { useViewer } from "@/components/viewer/viewer-provider";
import type { TaskSummary } from "@/lib/tasks/types";
import { requestData } from "@/lib/marketplace/http";
import type { ApplicationView } from "@/lib/applications/service";
import { shouldUseMarketplacePreview } from "@/lib/marketplace/preview";

export function TaskApplications({
  task,
  readOnly = false,
}: {
  task: TaskSummary;
  readOnly?: boolean;
}) {
  const { isPreview } = useViewer();
  return shouldUseMarketplacePreview(isPreview)
    ? <DemoTaskApplications readOnly={readOnly} task={task} />
    : <PersistentTaskApplications key={task.id} readOnly={readOnly} task={task} />;
}

function DemoTaskApplications({
  task,
  readOnly = false,
}: {
  task: TaskSummary;
  readOnly?: boolean;
}) {
  const { applicationsForTask, assignmentForTask, selectTasker } = useMarketplace();
  const { setStatus } = useMockTasks();
  const { viewer } = useViewer();
  const [feedback, setFeedback] = useState("");
  const applications = applicationsForTask(task.id);
  const assignment = assignmentForTask(task.id);
  const hasSelection =
    assignment?.status === "pending_payment" || assignment?.status === "active";

  function handleSelect(application: DemoApplication) {
    if (
      !window.confirm(
        `Select ${application.tasker}? The task and Tasker are reserved for 24 hours while the Poster completes payment. Other applications stay pending.`,
      )
    ) {
      return;
    }

    const result = selectTasker({ task, application });
    if (!result.ok) {
      setFeedback(result.reason);
      return;
    }

    setStatus(task.id, "pending_payment");
    setFeedback(
      `Selected ${application.tasker}. Continue to payment below; the hold ends in 24 hours.`,
    );
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No applications yet. Taskers can apply while the task is open.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      <p className="text-xs text-zinc-400">
        Demo: applications and verification states come from this browser session.
      </p>
      {feedback ? (
        <p
          aria-live="polite"
          className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300"
          role="status"
        >
          {feedback}
        </p>
      ) : null}

      {applications.map((application) => {
        const approval = approvalFor(
          application,
          task,
          application.tasker === viewer.displayName ? viewer.verification : undefined,
        );
        const selectable =
          approval.approvable &&
          !readOnly &&
          !hasSelection &&
          task.status === "open";

        return (
          <Card key={application.id}>
            <CardContent className="grid gap-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{application.tasker}</p>
                  <Badge className={verificationClass(application.verification)}>
                    {verificationLabel(application.verification)}
                  </Badge>
                  {application.status !== "submitted" ? (
                    <Badge className={applicationStatusClass(application.status)}>
                      {applicationStatusLabel(application.status)}
                    </Badge>
                  ) : null}
                </div>
                {application.amountCents !== null ? (
                  <p className="text-sm font-bold">
                    PHP {(application.amountCents / 100).toFixed(2)}
                  </p>
                ) : null}
              </div>

              {application.message ? (
                <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                  {application.message}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <span>
                  {application.kind === "bid" ? "Bid" : "Fixed-price request"}
                  {application.estimatedTime
                    ? ` · ${application.estimatedTime}`
                    : ""}
                </span>
                {!approval.approvable ? (
                  <span className="font-medium text-zinc-600 dark:text-zinc-300">
                    {approval.reason}
                  </span>
                ) : (
                  <Button
                    disabled={!selectable}
                    onClick={() => handleSelect(application)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {readOnly
                      ? "Task closed"
                      : hasSelection
                        ? "Tasker selected"
                        : "Select Tasker"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function PersistentTaskApplications({
  task,
  readOnly = false,
}: {
  task: TaskSummary;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const { viewer } = useViewer();
  const [applications, setApplications] = useState<ApplicationView[]>([]);
  const [role, setRole] = useState<"poster" | "tasker" | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void requestData<{ role: "poster" | "tasker"; applications: ApplicationView[] }>(
      `/api/tasks/${encodeURIComponent(task.id)}/bids`,
      { signal: controller.signal },
    )
      .then((result) => {
        setRole(result.role);
        setApplications(result.applications);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load applications.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [task.id, reloadCount]);

  async function selectTasker(application: ApplicationView) {
    if (!window.confirm(`Select ${application.taskerName ?? "this Tasker"}? The Tasker is reserved while you complete payment.`)) return;
    setSavingId(application.id);
    setError("");
    try {
      await requestData(`/api/tasks/${encodeURIComponent(task.id)}/hire`, {
        method: "POST",
        body: JSON.stringify({ taskerId: application.taskerId }),
      });
      router.push(`/checkout?taskId=${encodeURIComponent(task.id)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not select this Tasker.");
      setSavingId(null);
    }
  }

  if (loading) return <p role="status" className="text-sm text-zinc-500">Loading applications…</p>;
  if (error && applications.length === 0) return <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30"><p role="alert" className="text-sm text-red-700 dark:text-red-400">Could not load the offers for this task. Please try again.</p><Button onClick={() => { setError(""); setLoading(true); setReloadCount((count) => count + 1); }} size="sm" type="button" variant="outline">Try again</Button></div>;
  if (applications.length === 0) {
    return <Card><CardContent className="grid gap-2 p-5"><p className="font-semibold">No offers yet</p><p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">Taskers can still apply while this task is open. You can share the task or check back later.</p></CardContent></Card>;
  }

  return (
    <div className="grid gap-3">
      {role !== "poster" ? <p className="text-xs text-zinc-500">Only the Poster can review other Taskers’ applications.</p> : null}
      {error ? <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p> : null}
      {applications.map((application) => {
        const selectable = role === "poster" && application.approvable && !readOnly && task.status === "open";
        return (
          <Card key={application.id}>
            <CardContent className="grid gap-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{application.taskerName ?? "Tasker"}</p>
                  <Badge className={verificationClass(application.verification)}>{verificationLabel(application.verification)}</Badge>
                  {application.status !== "submitted" ? <Badge className={applicationStatusClass(application.status)}>{applicationStatusLabel(application.status)}</Badge> : null}
                </div>
                {application.amountCents !== null ? <p className="text-sm font-bold">PHP {(application.amountCents / 100).toFixed(2)}</p> : null}
              </div>
              {application.message ? <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{application.message}</p> : null}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <span>{application.kind === "bid" ? "Bid" : "Fixed-price request"}{application.estimatedTime ? ` · ${application.estimatedTime}` : ""}</span>
                {!application.approvable ? <span className="font-medium text-zinc-600 dark:text-zinc-300">{application.blockedReason}</span> : (
                  <Button disabled={!selectable || savingId !== null} onClick={() => void selectTasker(application)} size="sm" type="button" variant="outline">
                    {savingId === application.id ? "Starting checkout…" : readOnly ? "Task closed" : !viewer.signedIn ? "Sign in to select" : "Select Tasker"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
