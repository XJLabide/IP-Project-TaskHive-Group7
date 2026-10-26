"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  CheckCircle2,
  Clock,
  Globe2,
  MapPin,
  Pencil,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PublicShell } from "@/components/layout/public-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApplicantList } from "@/components/viewer/applicant-list";
import { GateNotice } from "@/components/viewer/gate-notice";
import { useViewer } from "@/components/viewer/viewer-provider";
import { useMockTasks } from "@/lib/mock-task-store";
import {
  formatTaskDeadline,
  taskFieldLabels,
  taskFormErrors,
  taskStatusClass,
  taskStatusLabel,
  taskToFields,
  toTaskFormValues,
} from "@/lib/tasks/ui";

export default function TaskDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center p-8 text-sm text-zinc-500">
          Loading task…
        </main>
      }
    >
      <TaskDetailContent />
    </Suspense>
  );
}

function TaskDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { viewer } = useViewer();
  const { tasks, ready, updateTask, cancelTask, deleteTask } = useMockTasks();
  const [actionMessage, setActionMessage] = useState("");

  const requestedNotice = searchParams.get("notice") ?? "";
  const [notice] = useState(() => {
    const allowed = ["Task published.", "Task changes saved.", "Draft saved."];
    return allowed.includes(requestedNotice) ? requestedNotice : "";
  });
  const [cleared] = useState(() => {
    const raw = Number.parseInt(searchParams.get("cleared") ?? "", 10);
    return Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 999) : 0;
  });

  // Strip the one-shot notice after it renders so a refresh or shared link
  // cannot replay a success message.
  useEffect(() => {
    if (!searchParams.has("notice") && !searchParams.has("cleared")) return;

    const remaining = new URLSearchParams(searchParams.toString());
    remaining.delete("notice");
    remaining.delete("cleared");
    const query = remaining.toString();
    router.replace(`/tasks/${id}${query ? `?${query}` : ""}`, { scroll: false });
  }, [id, router, searchParams]);

  // Guests keep the public site chrome; signed-in accounts get the workspace shell.
  const Shell: ComponentType<{ title: string; description: string; children: ReactNode }> =
    viewer.signedIn ? AppShell : PublicShell;
  const task = tasks.find((item) => item.id === id);
  const viewerName = viewer.signedIn ? (viewer.displayName ?? "You") : null;
  const isOwner = Boolean(task && viewerName && task.poster === viewerName);

  function handlePublish() {
    if (!task || !isOwner) return;

    const errors = taskFormErrors(toTaskFormValues(task), { publish: true });
    const missing = Object.keys(errors).map(
      (field) => taskFieldLabels[field as keyof typeof taskFieldLabels],
    );
    if (missing.length > 0) {
      setActionMessage(
        `Complete these details before publishing: ${missing.join(", ")}.`,
      );
      return;
    }

    const result = updateTask(task.id, taskToFields(task), { publish: true });
    if (!result.ok) {
      setActionMessage(
        result.errors
          ? "Complete the required details in the editor before publishing."
          : result.reason ?? "Could not publish this task.",
      );
      return;
    }
    setActionMessage("Task published.");
  }

  function handleCancel() {
    if (!task || !isOwner) return;
    if (
      !window.confirm(
        `Cancel “${task.title}”? It will leave public browsing, and its applications and history will be kept.`,
      )
    ) {
      return;
    }
    const result = cancelTask(task.id);
    if (!result.ok) {
      setActionMessage(result.reason ?? "Could not cancel this task.");
      return;
    }
    setActionMessage("Task cancelled. Applications and history are retained.");
  }

  function handleDelete() {
    if (!task || !isOwner) return;
    if (
      !window.confirm(
        `Delete draft “${task.title}”? This permanently removes the draft and cannot be undone.`,
      )
    ) {
      return;
    }
    const result = deleteTask(task.id);
    if (!result.ok) {
      setActionMessage(result.reason ?? "Could not delete this draft.");
      return;
    }
    router.push("/tasks");
  }

  if (!ready) {
    return (
      <Shell title="Task details" description="Loading this browser session’s tasks.">
        <p>Loading task…</p>
      </Shell>
    );
  }

  if (!task || (task.status !== "open" && !isOwner)) {
    return (
      <Shell title="Task not found" description="This task is not available in this browser session.">
        <Card>
          <CardContent className="grid gap-4 p-6">
            <p>The task may have been deleted or this browser session may have been cleared.</p>
            <Button asChild className="w-fit">
              <Link href="/tasks">Back to Browse Tasks</Link>
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const isDraft = task.status === "draft";
  const isOpen = task.status === "open";
  const isCancelled = task.status === "cancelled";
  const draftGuidance =
    "Only you can see this draft. Publish it when the details are complete.";

  return (
    <Shell
      title={task.title || "Untitled draft"}
      description={
        task.fulfillmentMode === "remote"
          ? `${task.category || "Task"} · Remote`
          : `${task.category || "Task"} task · ${task.location ?? "area not set"} (approx.)`
      }
    >
      {notice ? (
        <div
          className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-[#75D333]/40 bg-[#75D333]/10 p-3 text-sm text-[#2f6b12] dark:text-[#75D333]"
          role="status"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{notice}</span>
          {cleared > 0 ? (
            <span>
              {cleared} pending {cleared === 1 ? "application was" : "applications were"} reset and{" "}
              {cleared === 1 ? "that Tasker was" : "those Taskers were"} notified.
            </span>
          ) : null}
        </div>
      ) : null}

      {actionMessage ? (
        <div
          className="mb-5 rounded-xl border border-[#FFC800]/40 bg-[#FFD50D]/15 p-3 text-sm text-zinc-700 dark:bg-[#FFC800]/10 dark:text-zinc-300"
          role="status"
        >
          {actionMessage}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-xl font-bold">{task.title || "Untitled draft"}</CardTitle>
              <Badge className={taskStatusClass(task.status)}>{taskStatusLabel(task.status)}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-[#FFC800]/40 bg-[#FFD50D]/25 text-zinc-800 dark:bg-[#FFC800]/15 dark:text-zinc-100">
                {task.category || "Uncategorised"}
              </Badge>
              <Badge>{task.fulfillmentMode === "local" ? "Local" : "Remote"}</Badge>
              <Badge>{task.hiringMode === "bidding" ? "Bidding" : "Fixed price"}</Badge>
            </div>

            <p className="text-zinc-600 dark:text-zinc-300">
              {task.description || "No description yet."}
            </p>

            <div className="grid gap-4 border-y border-zinc-100 py-5 text-sm dark:border-zinc-800 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">Budget</span>
                <strong className="mt-1 block">
                  {task.budget > 0 ? `PHP ${task.budget.toFixed(2)}` : "Not set"}
                </strong>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">Applications</span>
                <strong className="mt-1 block">
                  {task.applications}
                  {isCancelled && task.applications > 0 ? " retained" : ""}
                </strong>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">Fulfillment</span>
                <strong className="mt-1 block">
                  {task.fulfillmentMode === "local" ? "Local" : "Remote"}
                </strong>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">Deadline</span>
                <strong className="mt-1 block">
                  {task.deadline ? formatTaskDeadline(task.deadline) : "Not set"}
                </strong>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              {task.fulfillmentMode === "local" ? (
                <>
                  <MapPin className="h-4 w-4 text-[#D19300] dark:text-[#FFD50D]" />
                  Approximate area: {task.location ?? "not set"}
                </>
              ) : (
                <>
                  <Globe2 className="h-4 w-4 text-[#D19300] dark:text-[#FFD50D]" />
                  Completed online — no approximate area
                </>
              )}
            </div>

            {task.fulfillmentMode === "local" ? (
              <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
                <div>
                  <MapPin className="mx-auto h-7 w-7 text-[#D19300] dark:text-[#FFD50D]" />
                  <p className="mt-3 text-sm font-semibold">Approximate area</p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    The exact service address is shared only after hire and payment.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
                <div>
                  <Globe2 className="mx-auto h-7 w-7 text-[#D19300] dark:text-[#FFD50D]" />
                  <p className="mt-3 text-sm font-semibold">Remote task</p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    The Tasker delivers the work online after hire.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <aside className="grid content-start gap-5">
          {isDraft ? (
            <Card>
              <CardContent className="grid gap-3 p-5">
                <h2 className="font-bold">Draft</h2>
                <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                  {draftGuidance}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {isOpen ? (
            viewer.canApply || viewer.canChat ? (
              <Card>
                <CardContent className="grid gap-3 p-5">
                  <h2 className="font-bold">Work on this task</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {viewer.canApply
                      ? "Apply while the task is open. The Poster chooses one Tasker."
                      : "Messaging the Poster is open to signed-in accounts."}
                  </p>
                  {viewer.canApply ? (
                    <Button type="button">Apply to this task</Button>
                  ) : viewer.denials.apply ? (
                    <GateNotice code={viewer.denials.apply} />
                  ) : null}
                  {viewer.canChat ? (
                    <Button type="button" variant="outline">
                      Message Poster
                    </Button>
                  ) : viewer.denials.chat ? (
                    <GateNotice code={viewer.denials.chat} />
                  ) : null}
                </CardContent>
              </Card>
            ) : viewer.denials.apply ? (
              <GateNotice code={viewer.denials.apply} />
            ) : null
          ) : (
            <Card>
              <CardContent className="p-5 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                This task is not accepting applications.
              </CardContent>
            </Card>
          )}

          {isOwner ? (
            <Card>
              <CardContent className="grid gap-3 p-5">
                <h2 className="font-bold">Manage task</h2>
                {isDraft ? (
                  <>
                    <Button onClick={handlePublish} type="button">
                      Publish task
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={`/tasks/${task.id}/edit`}>
                        <Pencil className="h-4 w-4" /> Edit draft
                      </Link>
                    </Button>
                    <Button onClick={handleDelete} type="button" variant="outline">
                      <Trash2 className="h-4 w-4" /> Delete draft
                    </Button>
                  </>
                ) : isOpen ? (
                  <>
                    <Button asChild>
                      <Link href={`/tasks/${task.id}/edit`}>
                        <Pencil className="h-4 w-4" /> Edit task
                      </Link>
                    </Button>
                    <Button onClick={handleCancel} type="button" variant="outline">
                      Cancel task
                    </Button>
                  </>
                ) : (
                  <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                    Cancelled tasks cannot be edited or deleted. Their applications and
                    history stay available.
                  </p>
                )}
                <Button asChild variant="ghost">
                  <Link href="/tasks">Back to Browse Tasks</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-bold">Frontend demo</p>
              <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                This task lives in session storage only. Bids, chat, payment, and map
                services are not connected.
              </p>
              <p className="mt-4 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <Clock className="h-4 w-4" />
                {task.deadline ? formatTaskDeadline(task.deadline) : "No deadline set"}
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>

      {isOpen && isOwner ? (
        <section className="mt-6 max-w-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
            Sample applicants · applications are not connected yet
          </p>
          <ApplicantList />
        </section>
      ) : null}

      {isCancelled && isOwner ? (
        <section className="mt-6 max-w-2xl">
          <Card>
            <CardContent className="p-5">
              <h2 className="font-bold">Retained history</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                {task.applications} {task.applications === 1 ? "application was" : "applications were"} kept
                with this cancelled task for support and history. They are no longer accepting
                new work.
              </p>
              <div className="mt-5">
                <ApplicantList />
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}
    </Shell>
  );
}
