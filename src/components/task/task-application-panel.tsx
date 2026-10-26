"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GateNotice } from "@/components/viewer/gate-notice";
import { useViewer } from "@/components/viewer/viewer-provider";
import { useMarketplace } from "@/lib/mock-marketplace-store";
import {
  applicationStatusLabel,
  kindForTask,
  type ApplicationFormErrors,
  type ApplicationFormValues,
} from "@/lib/applications/demo";
import { canWithdraw } from "@/lib/applications/rules";
import { applicationStatusClass } from "@/lib/applications/ui";
import { formatTaskDeadline } from "@/lib/tasks/ui";
import type { TaskSummary } from "@/lib/tasks/types";

const inputClass =
  "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-[#D19300] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-[#FFD50D]";

const emptyValues: ApplicationFormValues = { amount: "", message: "", estimatedTime: "" };

export function TaskApplicationPanel({ task }: { task: TaskSummary }) {
  const { viewer } = useViewer();
  const {
    applicationsForTask,
    liveApplication,
    submit,
    withdraw,
  } = useMarketplace();
  const [values, setValues] = useState<ApplicationFormValues>(emptyValues);
  const [errors, setErrors] = useState<ApplicationFormErrors>({});
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  const tasker = viewer.displayName;
  const kind = kindForTask(task);
  const mine = tasker
    ? applicationsForTask(task.id).find((application) => application.tasker === tasker)
    : null;
  const live = tasker ? liveApplication(task.id, tasker) : null;
  const canApply = viewer.canApply && task.status === "open" && !live;

  function update<Key extends keyof ApplicationFormValues>(
    key: Key,
    value: ApplicationFormValues[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tasker) return;

    setSaving(true);
    setFeedback("");
    // Keep the demo send state visible long enough to review.
    await new Promise((resolve) => setTimeout(resolve, 250));

    const result = submit({
      task,
      tasker,
      verification: viewer.verification,
      values,
    });
    setSaving(false);

    if (!result.ok) {
      if (result.errors) setErrors(result.errors);
      else setFeedback(result.reason ?? "Could not send this application.");
      return;
    }

    setErrors({});
    setValues(emptyValues);
    setFeedback("Application sent. The Poster chooses one Tasker.");
  }

  function handleWithdraw(id: string) {
    if (!tasker) return;
    if (!window.confirm("Withdraw this application? You can apply again while the task is open.")) {
      return;
    }

    const result = withdraw(task, tasker, id);
    setFeedback(result.ok ? "Application withdrawn." : result.reason);
  }

  if (task.poster === viewer.displayName && viewer.signedIn) {
    return null;
  }

  return (
    <Card>
      <CardContent className="grid gap-4 p-5">
        <div>
          <h2 className="font-bold">Your application</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            {kind === "bid"
              ? "Send a bid with your price and a short message. The Poster selects one Tasker."
              : `Request this task at the listed price of PHP ${task.budget.toFixed(2)}. The Poster selects one Tasker.`}
          </p>
        </div>

        {!viewer.signedIn ? (
          <>
            <GateNotice code="sign_in_required" />
            <Button asChild size="sm" variant="outline">
              <Link href="/login">Sign in to apply</Link>
            </Button>
          </>
        ) : viewer.denials.apply ? (
          <GateNotice code={viewer.denials.apply} />
        ) : null}

        {feedback ? (
          <p
            aria-live="polite"
            className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300"
            role="status"
          >
            {feedback}
          </p>
        ) : null}

        {live ? (
          <div className="grid gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">Application {applicationStatusLabel(live.status).toLowerCase()}</p>
              <Badge className={applicationStatusClass(live.status)}>{applicationStatusLabel(live.status)}</Badge>
            </div>
            <dl className="grid gap-1 text-sm text-zinc-600 dark:text-zinc-300">
              {live.amountCents !== null ? (
                <div className="flex justify-between gap-4">
                  <dt>{live.kind === "bid" ? "Your bid" : "Listed price"}</dt>
                  <dd className="font-semibold">PHP {(live.amountCents / 100).toFixed(2)}</dd>
                </div>
              ) : null}
              {live.estimatedTime ? (
                <div className="flex justify-between gap-4">
                  <dt>Estimated time</dt>
                  <dd>{live.estimatedTime}</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt>Verification</dt>
                <dd className="capitalize">{live.verification.replace("_", " ")}</dd>
              </div>
            </dl>
            {live.verification !== "verified" ? (
              <p className="rounded-lg bg-[#FFD50D]/15 px-3 py-2 text-xs leading-5 text-zinc-700 dark:bg-[#FFC800]/10 dark:text-zinc-300">
                The Poster can see this application, but cannot select you until your identity
                verification is complete.
              </p>
            ) : null}
            {canWithdraw({
              applicationStatus: live.status,
              taskStatus: task.status,
            }).allowed ? (
              <Button
                onClick={() => handleWithdraw(live.id)}
                size="sm"
                type="button"
                variant="outline"
              >
                Withdraw application
              </Button>
            ) : (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Applications are locked once the Poster starts hiring or the task closes.
              </p>
            )}
          </div>
        ) : null}

        {mine && !live ? (
          <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
            Your last application is {applicationStatusLabel(mine.status).toLowerCase()}. You can
            apply again while the task is open.
          </p>
        ) : null}

        {canApply ? (
          <form className="grid gap-3" noValidate onSubmit={handleSubmit}>
            {kind === "bid" ? (
              <label className="grid gap-1.5 text-sm font-semibold">
                Your bid (PHP)
                <input
                  aria-invalid={errors.amount ? true : undefined}
                  className={inputClass}
                  inputMode="decimal"
                  min="0"
                  onChange={(event) => update("amount", event.target.value)}
                  placeholder="450"
                  step="0.01"
                  type="number"
                  value={values.amount}
                />
                {errors.amount ? (
                  <span className="text-xs font-normal text-[#a01a26] dark:text-[#F04452]">
                    {errors.amount}
                  </span>
                ) : null}
              </label>
            ) : null}

            <label className="grid gap-1.5 text-sm font-semibold">
              Message {kind === "request" ? "(optional)" : ""}
              <textarea
                aria-invalid={errors.message ? true : undefined}
                className="min-h-24 rounded-xl border border-zinc-200 bg-white p-3 text-sm font-normal text-zinc-950 outline-none focus:border-[#D19300] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-[#FFD50D]"
                maxLength={500}
                onChange={(event) => update("message", event.target.value)}
                placeholder="Availability, experience, or a question"
                value={values.message}
              />
              {errors.message ? (
                <span className="text-xs font-normal text-[#a01a26] dark:text-[#F04452]">
                  {errors.message}
                </span>
              ) : null}
            </label>

            {kind === "bid" ? (
              <label className="grid gap-1.5 text-sm font-semibold">
                Estimated time (optional)
                <input
                  className={inputClass}
                  maxLength={60}
                  onChange={(event) => update("estimatedTime", event.target.value)}
                  placeholder="1 hour"
                  value={values.estimatedTime}
                />
              </label>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Deadline: {task.deadline ? formatTaskDeadline(task.deadline) : "not set"}
              </p>
              <Button disabled={saving} size="sm" type="submit">
                {saving ? "Sending…" : kind === "bid" ? "Send bid" : "Send request"}
              </Button>
            </div>
          </form>
        ) : null}

        {task.status !== "open" && task.status !== "draft" ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            This task is no longer accepting applications.
          </p>
        ) : null}

        <p className="text-xs leading-5 text-zinc-400">
          Demo: applications are stored in this browser session. Selecting a Tasker and payment
          are not connected.
        </p>
      </CardContent>
    </Card>
  );
}
