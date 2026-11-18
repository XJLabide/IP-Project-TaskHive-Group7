"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Globe2, MapPin, Pencil, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PublicShell } from "@/components/layout/public-shell";
import { TaskApplicationPanel } from "@/components/task/task-application-panel";
import { TaskApplications } from "@/components/task/task-applications";
import { TaskChat } from "@/components/task/task-chat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useViewer } from "@/components/viewer/viewer-provider";
import { requestData } from "@/lib/marketplace/http";
import type { PublicTaskDetail } from "@/lib/tasks/discovery";
import { publicTaskToSummary } from "@/lib/tasks/public-ui";
import { formatTaskDeadline, taskStatusClass, taskStatusLabel } from "@/lib/tasks/ui";

export function PersistentTaskDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { viewer } = useViewer();
  const [detail, setDetail] = useState<PublicTaskDetail | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void requestData<PublicTaskDetail>(`/api/tasks/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then((task) => {
        setDetail(task);
        setLoadedId(id);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Could not load this task.");
          setLoadedId(id);
        }
      });
    return () => controller.abort();
  }, [id]);

  const paymentReturn = searchParams.get("payment");
  const notice = searchParams.get("notice");
  const task = detail
    ? publicTaskToSummary(detail, { status: detail.taskStatus, exactAddress: detail.exactAddress })
    : null;
  const loading = loadedId !== id;
  const isOwner = detail?.isPoster ?? false;
  const isOpen = detail?.taskStatus === "open";
  const isDraft = detail?.taskStatus === "draft";
  const hasAssignment = ["assigned", "in_progress", "awaiting_confirmation", "completed", "disputed", "cancellation_review"].includes(detail?.taskStatus ?? "");

  async function runTaskAction(path: string, method: string, successMessage: string) {
    if (!detail || saving) return;
    setSaving(true);
    setError("");
    setActionMessage("");
    try {
      await requestData(path, { method });
      const next = await requestData<PublicTaskDetail>(`/api/tasks/${encodeURIComponent(id)}`);
      setDetail(next);
      setActionMessage(successMessage);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update this task.");
    } finally {
      setSaving(false);
    }
  }

  function cancelTask() {
    if (!detail || !window.confirm(`Cancel “${detail.title}”? The task and application history will be retained.`)) return;
    void runTaskAction(`/api/tasks/${encodeURIComponent(id)}/cancel`, "POST", "Task cancelled. Its history is retained.");
  }

  function deleteDraft() {
    if (!detail || !window.confirm(`Delete draft “${detail.title}”? This permanently removes it.`)) return;
    void requestData(`/api/tasks/${encodeURIComponent(id)}`, { method: "DELETE" })
      .then(() => router.push("/tasks"))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not delete this draft."));
  }

  if (loading) return <AppShell title="Task details" description="Loading your TaskHive task."><p role="status">Loading task…</p></AppShell>;
  if (error && !detail) {
    const Shell = viewer.signedIn ? AppShell : PublicShell;
    return <Shell title="Task not found" description="This task is unavailable."><Card><CardContent className="grid gap-4 p-6"><p role="alert">{error}</p><Button asChild className="w-fit" variant="outline"><Link href="/tasks">Back to Browse Tasks</Link></Button></CardContent></Card></Shell>;
  }
  if (!detail || !task) return null;

  const Shell = viewer.signedIn ? AppShell : PublicShell;
  const description = task.fulfillmentMode === "remote"
    ? `${task.category || "Task"} · Remote`
    : `${task.category || "Task"} task · ${task.location ?? "area not set"} (approx.)`;

  return (
    <Shell title={task.title || "Task details"} description={description}>
      {paymentReturn === "success" ? <p role="status" className="mb-5 rounded-xl border border-[#75D333]/40 bg-[#75D333]/10 p-3 text-sm text-[#2f6b12] dark:text-[#75D333]">You returned from checkout. Task status reflects the provider’s confirmation.</p> : null}
      {paymentReturn === "cancelled" ? <p role="status" className="mb-5 rounded-xl border border-zinc-200 p-3 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">Checkout was cancelled. No payment was confirmed.</p> : null}
      {notice && ["Task published.", "Task changes saved.", "Draft saved."].includes(notice) ? <p role="status" className="mb-5 rounded-xl border border-[#75D333]/40 bg-[#75D333]/10 p-3 text-sm text-[#2f6b12] dark:text-[#75D333]">{notice}</p> : null}
      {error ? <p role="alert" className="mb-5 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</p> : null}
      {actionMessage ? <p role="status" className="mb-5 rounded-xl border border-[#75D333]/40 bg-[#75D333]/10 p-3 text-sm text-[#2f6b12] dark:text-[#75D333]">{actionMessage}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{task.title || "Untitled draft"}</h2><Badge className={taskStatusClass(task.status)}>{taskStatusLabel(task.status)}</Badge></div></CardHeader>
          <CardContent className="grid gap-6">
            <div className="flex flex-wrap items-center gap-2"><Badge>{task.category || "Uncategorised"}</Badge><Badge>{task.fulfillmentMode === "local" ? "Local" : "Remote"}</Badge><Badge>{task.hiringMode === "bidding" ? "Bidding" : "Fixed price"}</Badge></div>
            <p className="text-zinc-600 dark:text-zinc-300">{task.description || "No description yet."}</p>
            <div className="grid gap-4 border-y border-zinc-100 py-5 text-sm dark:border-zinc-800 sm:grid-cols-2 lg:grid-cols-4">
              <div><span className="text-zinc-500 dark:text-zinc-400">{task.hiringMode === "bidding" ? "Budget" : "Price"}</span><strong className="mt-1 block">PHP {task.budget.toFixed(2)}</strong></div>
              <div><span className="text-zinc-500 dark:text-zinc-400">Applications</span><strong className="mt-1 block">{task.applications}</strong></div>
              <div><span className="text-zinc-500 dark:text-zinc-400">Fulfillment</span><strong className="mt-1 block">{task.fulfillmentMode === "local" ? "Local" : "Remote"}</strong></div>
              <div><span className="text-zinc-500 dark:text-zinc-400">Deadline</span><strong className="mt-1 block">{task.deadline ? formatTaskDeadline(task.deadline) : "Not set"}</strong></div>
            </div>
            {task.fulfillmentMode === "local" ? <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-900/50"><div><MapPin className="mx-auto h-7 w-7 text-[#D19300] dark:text-[#FFD50D]" /><p className="mt-3 text-sm font-semibold">{detail.addressVisible ? "Service address" : "Approximate area"}</p><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{detail.addressVisible && task.addressLine ? task.addressLine : `${task.location ?? "Service area not set"}. The exact address is shared with the selected Tasker after payment is confirmed.`}</p></div></div> : <div className="grid min-h-36 place-items-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-900/50"><div><Globe2 className="mx-auto h-7 w-7 text-[#D19300] dark:text-[#FFD50D]" /><p className="mt-3 text-sm font-semibold">Remote task</p><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Work is completed online.</p></div></div>}
          </CardContent>
        </Card>

        <aside className="grid content-start gap-5">
          {isOwner ? <Card><CardContent className="grid gap-3 p-5"><h2 className="font-bold">Manage task</h2>
            {isDraft ? <><p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">Only you can see this draft. Publish it when its details are complete.</p><Button disabled={saving} onClick={() => void runTaskAction(`/api/tasks/${encodeURIComponent(id)}/publish`, "POST", "Task published.")}>{saving ? "Publishing…" : "Publish task"}</Button><Button asChild variant="outline"><Link href={`/tasks/${id}/edit`}><Pencil className="h-4 w-4" />Edit draft</Link></Button><Button disabled={saving} onClick={deleteDraft} variant="outline"><Trash2 className="h-4 w-4" />Delete draft</Button></> : isOpen ? <><Button asChild><Link href={`/tasks/${id}/edit`}><Pencil className="h-4 w-4" />Edit task</Link></Button><Button disabled={saving} onClick={cancelTask} variant="outline">Cancel task</Button></> : detail.taskStatus === "pending_payment" ? <><p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">The selected Tasker is reserved while payment is completed.</p><Button asChild><Link href={`/checkout?taskId=${encodeURIComponent(id)}`}>Continue to payment</Link></Button></> : <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">Task status and history are saved to your account.</p>}
            <Button asChild variant="ghost"><Link href="/tasks">Back to Browse Tasks</Link></Button>
          </CardContent></Card> : null}
          {!isOwner && detail.taskStatus === "pending_payment" ? <Card><CardContent className="grid gap-2 p-5 text-sm leading-6 text-zinc-500 dark:text-zinc-400"><h2 className="font-bold text-zinc-950 dark:text-zinc-50">Payment in progress</h2><p>The Poster is completing payment. The selected Tasker is reserved during the payment hold.</p>{detail.isAssignedTasker ? <p className="font-medium">You are the selected Tasker.</p> : null}</CardContent></Card> : null}
          {hasAssignment && !isOwner ? <Card><CardContent className="grid gap-2 p-5 text-sm leading-6 text-zinc-500 dark:text-zinc-400"><h2 className="font-bold text-zinc-950 dark:text-zinc-50">Assignment active</h2><p>Payment and assignment status are saved to TaskHive.</p>{detail.isAssignedTasker ? <p className="font-medium">You are the assigned Tasker.</p> : null}</CardContent></Card> : null}
          {!isDraft && !["pending_payment", "assigned", "in_progress"].includes(detail.taskStatus) ? <TaskApplicationPanel task={task} /> : null}
        </aside>
      </div>

      {isOwner && (isOpen || detail.taskStatus === "pending_payment" || hasAssignment || detail.taskStatus === "cancelled") ? <section className="mt-6 max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">{detail.taskStatus === "cancelled" ? "Retained applications" : "Applications"}</p><h2 className="mt-1 text-xl font-bold">{detail.taskStatus === "cancelled" ? "Kept for history" : "Compare applicants"}</h2><p className="mb-4 mt-1 text-sm text-zinc-500 dark:text-zinc-400">Pending-verification Taskers are visible, but cannot be selected until their identity check is complete.</p><TaskApplications readOnly={!isOpen} task={task} /></section> : null}
      {!isDraft ? <section className="mt-6 max-w-3xl"><TaskChat task={task} /></section> : null}
    </Shell>
  );
}
