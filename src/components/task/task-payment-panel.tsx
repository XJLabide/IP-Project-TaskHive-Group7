"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useViewer } from "@/components/viewer/viewer-provider";
import { useMarketplace } from "@/lib/mock-marketplace-store";
import { useMockTasks } from "@/lib/mock-task-store";
import { formatRemaining, remainingMs } from "@/lib/payments/demo";
import { formatChatTime } from "@/lib/chat/demo";
import type { TaskSummary } from "@/lib/tasks/types";

function money(cents: number): string {
  return `PHP ${(cents / 100).toFixed(2)}`;
}

export function TaskPaymentPanel({ task }: { task: TaskSummary }) {
  const { viewer } = useViewer();
  const { assignmentForTask, expireHold } = useMarketplace();
  const { setStatus } = useMockTasks();
  const [now, setNow] = useState(() => new Date());
  const [feedback, setFeedback] = useState("");

  const assignment = assignmentForTask(task.id);
  const isOwner =
    viewer.signedIn &&
    (viewer.displayName === task.poster ||
      (viewer.displayName === "Ana Reyes" && task.poster === "TaskHive Member") ||
      (viewer.displayName === "TaskHive Member" && task.poster === "Ana Reyes"));
  const pending = assignment?.status === "pending_payment";

  useEffect(() => {
    if (!pending) return;
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, [pending]);

  useEffect(() => {
    if (!assignment || assignment.status !== "pending_payment") return;
    if (remainingMs(assignment, now) > 0) return;

    const timer = setTimeout(() => {
      const result = expireHold(task.id, now);
      if (result.expired) {
        setStatus(task.id, "open");
        setFeedback(
          "The 24-hour payment window expired. The task reopened and other applications remain.",
        );
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [assignment, expireHold, now, setStatus, task.id]);

  if (
    !isOwner ||
    !assignment ||
    assignment.status === "expired" ||
    assignment.status === "completed" ||
    assignment.status === "disputed" ||
    assignment.status === "cancellation_review" ||
    Boolean(assignment.completedAt)
  ) {
    return null;
  }

  const remaining = formatRemaining(remainingMs(assignment, now));

  return (
    <Card>
      <CardContent className="grid gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-bold">
              {assignment.status === "active" ? "Assignment active" : "Payment hold"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Selected Tasker: <span className="font-semibold">{assignment.tasker}</span>
            </p>
          </div>
          <Badge
            className={
              assignment.status === "active"
                ? "border-[#75D333]/40 bg-[#75D333]/15 text-[#2f6b12] dark:text-[#75D333]"
                : "border-[#FFC800]/40 bg-[#FFD50D]/20 text-zinc-700 dark:bg-[#FFC800]/15 dark:text-zinc-200"
            }
          >
            {assignment.status === "active" ? "Paid" : `Hold · ${remaining}`}
          </Badge>
        </div>

        <dl className="grid gap-2 rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500 dark:text-zinc-400">Task price</dt>
            <dd className="font-semibold">{money(assignment.amountCents)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-500 dark:text-zinc-400">
              Platform fee (5%, deducted from Tasker payout)
            </dt>
            <dd>{money(assignment.platformFeeCents)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-zinc-100 pt-2 dark:border-zinc-800">
            <dt className="font-semibold">Tasker receives</dt>
            <dd className="font-bold">{money(assignment.payoutCents)}</dd>
          </div>
        </dl>

        {feedback ? (
          <p
            aria-live="polite"
            className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300"
            role="status"
          >
            {feedback}
          </p>
        ) : null}

        {assignment.status === "active" ? (
          <div className="grid gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            <p>
              Paid {assignment.paidAt ? formatChatTime(assignment.paidAt) : "just now"} ·{" "}
              {assignment.attemptCount} checkout attempt
              {assignment.attemptCount === 1 ? "" : "s"}
            </p>
            <p className="text-xs text-zinc-400">
              Other applications were closed when the assignment activated. Exact local address
              sharing follows the payment/assignment rule.
            </p>
          </div>
        ) : (
          <>
            {assignment.lastError ? (
              <p
                className="rounded-lg bg-[#F04452]/10 px-3 py-2 text-sm text-[#a01a26] dark:text-[#F04452]"
                role="alert"
              >
                {assignment.lastError}
              </p>
            ) : null}

            <div className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href={`/checkout?taskId=${task.id}`}>
                    {assignment.attemptCount > 0 ? "Retry Payment" : "Proceed to Checkout"}
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {assignment.attemptCount > 0
                  ? `Attempt ${assignment.attemptCount} was declined. Retry before the reservation hold ends.`
                  : "The task and selected Tasker stay reserved for 24 hours while payment is completed."}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <span className="text-xs text-zinc-400">
                Other applications stay pending until the payment hold closes.
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
