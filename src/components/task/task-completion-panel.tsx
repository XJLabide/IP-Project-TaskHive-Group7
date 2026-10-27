"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useViewer } from "@/components/viewer/viewer-provider";
import { formatChatTime } from "@/lib/chat/demo";
import { formatRemaining } from "@/lib/payments/demo";
import { reminderCutoff } from "@/lib/completion/rules";
import { useMarketplace } from "@/lib/mock-marketplace-store";
import { useMockTasks } from "@/lib/mock-task-store";
import type { TaskSummary } from "@/lib/tasks/types";
import { TaskReviewPanel } from "./task-review-panel";

const hourMs = 60 * 60 * 1000;

function money(cents: number): string {
  return `PHP ${(cents / 100).toFixed(2)}`;
}

function remainingMs(target: string | null | undefined, now: Date): number {
  if (!target) return 0;
  return Math.max(0, new Date(target).getTime() - now.getTime());
}

export function TaskCompletionPanel({ task }: { task: TaskSummary }) {
  const { viewer } = useViewer();
  const {
    assignmentForTask,
    submitCompletion,
    confirmCompletion,
    disputeCompletion,
    tickCompletion,
    requestCancellation,
  } = useMarketplace();
  const { setStatus } = useMockTasks();
  const [now, setNow] = useState(() => new Date());
  const [note, setNote] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [reason, setReason] = useState("");
  const [showDispute, setShowDispute] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [showCancellation, setShowCancellation] = useState(false);
  const [feedback, setFeedback] = useState("");

  const assignment = assignmentForTask(task.id);
  const isPoster =
    viewer.signedIn && viewer.displayName === task.poster;
  const isTasker =
    viewer.signedIn && viewer.displayName === assignment?.tasker;
  const canSee = Boolean(assignment) && (isPoster || isTasker);
  const submitted = Boolean(assignment?.completedAt);

  useEffect(() => {
    if (!assignment || assignment.status !== "active" || !submitted) return;
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, [assignment, submitted]);

  useEffect(() => {
    if (!assignment || assignment.status !== "active" || !submitted) return;

    const reminderDue =
      !assignment.reminderSentAt &&
      Boolean(assignment.completedAt) &&
      new Date(assignment.completedAt as string).getTime() <=
        reminderCutoff(now).getTime();
    const releaseDue =
      Boolean(assignment.autoReleaseAt) &&
      new Date(assignment.autoReleaseAt as string).getTime() <= now.getTime();

    if (!reminderDue && !releaseDue) return;

    const timer = window.setTimeout(() => {
      const result = tickCompletion(task.id, now);
      if (result.reminded) {
        setFeedback("The 24-hour reminder was sent to the Poster.");
      }
      if (result.released) {
        setStatus(task.id, "completed");
        setFeedback("No dispute was opened, so the payout auto-released after 48 hours.");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [assignment, now, setStatus, submitted, task.id, tickCompletion]);

  if (!canSee || !assignment) return null;
  if (assignment.status === "pending_payment" || assignment.status === "expired") {
    return null;
  }

  const isRemote = task.fulfillmentMode === "remote";
  const countdown = formatRemaining(
    remainingMs(assignment.autoReleaseAt, now),
  );

  function handleSubmit() {
    if (!viewer.displayName) return;
    const result = submitCompletion({
      taskId: task.id,
      task,
      actor: viewer.displayName,
      note,
      url: evidenceUrl || null,
    });

    if (!result.ok) {
      setFeedback(result.reason);
      return;
    }

    setStatus(task.id, "awaiting_confirmation");
    setFeedback(
      "Completion submitted. The Poster has 48 hours to confirm before the payout releases automatically.",
    );
  }

  function handleConfirm() {
    if (!viewer.displayName) return;
    const result = confirmCompletion(task.id, task, viewer.displayName);
    if (!result || !result.ok) {
      setFeedback(result?.ok === false ? result.reason : "The assignment was not found.");
      return;
    }

    setStatus(task.id, "completed");
    setFeedback("Payout released. Reviews are now unlocked for both participants.");
  }

  function handleDispute() {
    if (!viewer.displayName) return;
    const result = disputeCompletion(
      task.id,
      task,
      viewer.displayName,
      reason,
    );
    if (!result || !result.ok) {
      setFeedback(result?.ok === false ? result.reason : "The assignment was not found.");
      return;
    }

    setStatus(task.id, "disputed");
    setShowDispute(false);
    setFeedback("Payout frozen. An Admin reviews the evidence before any money moves.");
  }

  async function handleCancellation() {
    if (!viewer.displayName) return;

    if (viewer.signedIn && task.id) {
      try {
        const response = await fetch(`/api/tasks/${task.id}/cancellation`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: cancellationReason }),
        });

        if (response.ok) {
          setShowCancellation(false);
          setStatus(task.id, "cancellation_review");
          setFeedback(
            "Cancellation requested. Work and payout stay paused while an Admin reviews it.",
          );
          return;
        }

        // Demo tasks live in sessionStorage, not the database; fall through only
        // when the server cannot find the task.
        if (response.status !== 404) {
          const body = await response.json().catch(() => ({}));
          setFeedback(
            typeof body.error === "string"
              ? body.error
              : "Could not request cancellation.",
          );
          return;
        }
      } catch {
        // Offline demo: keep the request in session state.
      }
    }

    const result = requestCancellation({
      taskId: task.id,
      task,
      actor: viewer.displayName,
      reason: cancellationReason,
    });

    if (!result.ok) {
      setFeedback(result.reason);
      return;
    }

    setShowCancellation(false);
    setStatus(task.id, "cancellation_review");
    setFeedback(
      "Cancellation requested. Work and payout stay paused while an Admin reviews it.",
    );
  }

  function simulate(hours: number) {
    if (!assignment?.completedAt) return;
    const simulated = new Date(
      new Date(assignment.completedAt).getTime() + hours * hourMs,
    );
    const result = tickCompletion(task.id, simulated);
    setNow(simulated);

    if (result.reminded) setFeedback("Demo: the 24-hour reminder was sent.");
    if (result.released) {
      setStatus(task.id, "completed");
      setFeedback("Demo: the undisputed payout auto-released at 48 hours.");
    }
  }

  const statusLabel =
    assignment.status === "completed"
      ? "Completed · paid"
      : assignment.status === "disputed"
        ? "Disputed · payout frozen"
        : assignment.status === "cancellation_review"
          ? "Cancellation review · paused"
          : submitted
            ? "Awaiting confirmation"
            : "Work in progress";

  const statusClass =
    assignment.status === "completed"
      ? "border-[#75D333]/40 bg-[#75D333]/15 text-[#2f6b12] dark:text-[#75D333]"
      : assignment.status === "disputed"
        ? "border-[#F04452]/40 bg-[#F04452]/10 text-[#a01a26] dark:text-[#F04452]"
        : "border-[#FFC800]/40 bg-[#FFD50D]/20 text-zinc-700 dark:bg-[#FFC800]/15 dark:text-zinc-200";

  const cancellationControls =
    assignment.status === "active" &&
    !assignment.cancellation &&
    !assignment.dispute &&
    !assignment.payoutReleasedAt ? (
      <div className="grid gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setShowCancellation((open) => !open)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {showCancellation ? "Keep work active" : "Request cancellation"}
          </Button>
        </div>
        {showCancellation ? (
          <div className="grid gap-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
            <label className="grid gap-2 text-sm font-semibold">
              Why should this task be cancelled?
              <textarea
                className="min-h-20 rounded-xl border border-zinc-200 bg-white p-3 text-sm font-normal outline-none focus:border-[#D19300] focus:ring-2 focus:ring-[#FFC800]/25 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-[#FFD50D]"
                onChange={(event) => setCancellationReason(event.target.value)}
                value={cancellationReason}
              />
            </label>
            <Button
              disabled={cancellationReason.trim().length < 10}
              onClick={handleCancellation}
              size="sm"
              type="button"
              variant="outline"
            >
              Pause work and request review
            </Button>
          </div>
        ) : null}
      </div>
    ) : null;

  const cancellationCard = assignment.cancellation ? (
    <div className="rounded-xl border border-[#FFC800]/40 bg-[#FFD50D]/10 p-4 text-sm leading-6 text-zinc-700 dark:text-zinc-200">
      <p className="font-semibold">Cancellation under review</p>
      <p className="mt-1">
        {assignment.cancellation.requestedBy} requested cancellation: “
        {assignment.cancellation.reason}”
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Work and payout are paused. Admin review target:{" "}
        {formatChatTime(assignment.cancellation.reviewDueAt)}. Reviews stay locked.
      </p>
    </div>
  ) : null;

  const disputeControls = (
    <div className="grid gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => setShowDispute((open) => !open)}
          size="sm"
          type="button"
          variant="outline"
        >
          {showDispute ? "Cancel dispute" : "Dispute payout"}
        </Button>
      </div>
      {showDispute ? (
        <div className="grid gap-2 rounded-xl border border-[#F04452]/30 p-3">
          <label className="grid gap-2 text-sm font-semibold">
            What is wrong?
            <textarea
              className="min-h-20 rounded-xl border border-zinc-200 bg-white p-3 text-sm font-normal outline-none focus:border-[#D19300] focus:ring-2 focus:ring-[#FFC800]/25 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-[#FFD50D]"
              onChange={(event) => setReason(event.target.value)}
              value={reason}
            />
          </label>
          <Button
            disabled={!reason.trim()}
            onClick={handleDispute}
            size="sm"
            type="button"
            variant="outline"
          >
            Freeze payout for review
          </Button>
        </div>
      ) : null}
    </div>
  );

  return (
    <Card>
      <CardContent className="grid gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-bold">Completion</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {isTasker ? "You are the assigned Tasker." : "You are the Poster."}
            </p>
          </div>
          <Badge className={statusClass}>{statusLabel}</Badge>
        </div>

        <dl className="grid gap-2 rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500 dark:text-zinc-400">Payout</dt>
            <dd className="font-semibold">
              {money(assignment.payoutCents)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500 dark:text-zinc-400">Status</dt>
            <dd>
              {assignment.payoutReleasedAt
                ? `Released ${formatChatTime(assignment.payoutReleasedAt)}`
                : assignment.cancellation
                  ? "Held for cancellation review"
                  : assignment.dispute
                    ? "Held for dispute review"
                    : submitted
                      ? `Auto-releases in ${countdown}`
                      : "Held until completion"}
            </dd>
          </div>
        </dl>

        {feedback ? (
          <p
            aria-live="polite"
            className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300"
            id="completion-feedback"
            role="status"
          >
            {feedback}
          </p>
        ) : null}

        {assignment.reminderSentAt && assignment.status === "active" ? (
          <p className="rounded-lg border border-[#FFC800]/40 bg-[#FFD50D]/15 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-200">
            Reminder: the Poster has not confirmed. The payout auto-releases in{" "}
            {countdown} unless a dispute is opened.
          </p>
        ) : null}

        {!submitted ? (
          assignment.cancellation ? (
            cancellationCard
          ) : isTasker ? (
            <div className="grid gap-3">
              <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                {isRemote
                  ? "Attach the deliverable link. A note is optional."
                  : "Describe the completed work. A photo or receipt link is optional."}
              </p>
              <label className="grid gap-2 text-sm font-semibold">
                {isRemote ? "Note (optional)" : "Completion note"}
                <textarea
                  aria-describedby={feedback ? "completion-feedback" : undefined}
                  className="min-h-24 rounded-xl border border-zinc-200 bg-white p-3 text-sm font-normal outline-none focus:border-[#D19300] focus:ring-2 focus:ring-[#FFC800]/25 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-[#FFD50D]"
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={
                    isRemote
                      ? "Optional note about the deliverable."
                      : "What did you complete?"
                  }
                  value={note}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                {isRemote ? "Deliverable link" : "Photo or receipt link (optional)"}
                <input
                  aria-describedby={feedback ? "completion-feedback" : undefined}
                  className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-normal outline-none focus:border-[#D19300] focus:ring-2 focus:ring-[#FFC800]/25 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-[#FFD50D]"
                  onChange={(event) => setEvidenceUrl(event.target.value)}
                  placeholder="https://…"
                  type="url"
                  value={evidenceUrl}
                />
              </label>
              <Button className="w-fit" onClick={handleSubmit} size="sm" type="button">
                Submit completion
              </Button>
              {disputeControls}
              {cancellationControls}
            </div>
          ) : (
            <div className="grid gap-3">
              <p className="rounded-lg border border-dashed border-zinc-300 p-3 text-sm leading-6 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                Waiting for {assignment.tasker} to submit completion. The payout stays held
                until you confirm.
              </p>
              {disputeControls}
              {cancellationControls}
            </div>
          )
        ) : (
          <div className="grid gap-3">
            <div className="rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
              <p className="font-semibold">Submitted evidence</p>
              {assignment.completionNote ? (
                <p className="mt-1 leading-6 text-zinc-600 dark:text-zinc-300">
                  {assignment.completionNote}
                </p>
              ) : null}
              {assignment.completionUrl ? (
                <a
                  className="mt-1 inline-block break-all font-medium text-[#D19300] underline underline-offset-4 dark:text-[#FFD50D]"
                  href={assignment.completionUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {isRemote ? "Open deliverable" : "Open photo or receipt"}
                </a>
              ) : null}
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Submitted {formatChatTime(assignment.completedAt ?? "")}
                {assignment.reminderSentAt
                  ? ` · reminder sent ${formatChatTime(assignment.reminderSentAt)}`
                  : ""}
              </p>
            </div>

            {assignment.cancellation ? (
              cancellationCard
            ) : assignment.dispute ? (
              <div className="rounded-xl border border-[#F04452]/30 bg-[#F04452]/5 p-4 text-sm leading-6 text-[#a01a26] dark:text-[#F04452]">
                <p className="font-semibold">Payout frozen</p>
                <p className="mt-1">
                  {assignment.dispute.openedBy} opened a dispute: “{assignment.dispute.reason}”
                </p>
                <p className="mt-1 text-xs">
                  An Admin reviews the evidence before the payout is released or refunded.
                </p>
              </div>
            ) : assignment.status === "completed" ? (
              <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                Payout released {formatChatTime(assignment.payoutReleasedAt ?? "")}.
                Both participants can now review.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {isPoster ? (
                    <Button onClick={handleConfirm} size="sm" type="button">
                      Confirm completion & release payout
                    </Button>
                  ) : null}
                </div>
                {disputeControls}
                {cancellationControls}

                <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <Button
                    onClick={() => simulate(24)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Simulate 24h reminder (demo)
                  </Button>
                  <Button
                    onClick={() => simulate(48)}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Simulate 48h auto-release (demo)
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {assignment.payoutReleasedAt ? (
          <TaskReviewPanel
            assignment={assignment}
            task={task}
            unlockedAt={assignment.payoutReleasedAt}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
