"use client";

import { useState, type FormEvent } from "react";
import { BadgeCheck, FileWarning, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { verificationSummary, type VerificationTone } from "@/lib/viewer/presentation";
import type { ViewerSnapshot } from "@/lib/viewer/presentation";

const toneClass: Record<VerificationTone, string> = {
  positive: "border-[#75D333]/40 bg-[#75D333]/15 text-[#2f6b12] dark:text-[#75D333]",
  pending: "border-[#FFC800]/40 bg-[#FFD50D]/25 text-zinc-800 dark:bg-[#FFC800]/15 dark:text-zinc-100",
  negative: "border-[#F04452]/40 bg-[#F04452]/10 text-[#a01a26] dark:text-[#F04452]",
  neutral: "",
};

type VerificationCardProps = {
  viewer: ViewerSnapshot;
  interactive?: boolean;
  onStartVerification?: () => void | Promise<boolean>;
  onSubmitAppeal?: (note: string) => void | Promise<boolean>;
};

/** The single verification surface: state, consequence, and the one available next step. */
export function VerificationCard({
  viewer,
  interactive = true,
  onStartVerification,
  onSubmitAppeal,
}: VerificationCardProps) {
  const summary = verificationSummary({
    status: viewer.verification,
    appealCount: viewer.appealCount,
  });
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleStart() {
    setError("");
    const ok = await onStartVerification?.();
    if (ok === false) {
      setError("Could not start verification. Check your connection and try again.");
    }
  }

  async function handleAppeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!interactive) return;
    if (note.trim().length < 10) {
      setError("Describe what the Admin should review in at least 10 characters.");
      return;
    }
    setError("");
    setSubmitted(true);
    const ok = await onSubmitAppeal?.(note.trim());
    if (ok === false) {
      setSubmitted(false);
      setError("Could not submit the appeal. Check your connection and try again.");
    }
  }

  return (
    <Card id="verification">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#D19300] dark:text-[#FFD50D]">
              Tasker verification
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">Identity check</h2>
          </div>
          <Badge className={toneClass[summary.tone]}>{summary.label}</Badge>
        </div>

        <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          {summary.description}
        </p>

        {viewer.verification === "not_started" ? (
          <Button
            className="mt-4"
            disabled={!interactive}
            onClick={() => void handleStart()}
            size="sm"
            type="button"
          >
            <BadgeCheck className="h-4 w-4" /> Start verification
          </Button>
        ) : null}

        {error && !viewer.canAppeal ? (
          <p className="mt-2 text-sm font-semibold text-[#a01a26] dark:text-[#F04452]" role="alert">
            {error}
          </p>
        ) : null}

        {viewer.canAppeal ? (
          <form className="mt-5 grid gap-3" id="appeal" onSubmit={handleAppeal}>
            <label className="grid gap-2 text-sm font-semibold">
              Appeal to Admin
              <textarea
                aria-describedby="appeal-help"
                className="min-h-28 rounded-xl border border-zinc-200 bg-white p-3 text-sm font-normal outline-none focus-visible:border-[#D19300] focus-visible:ring-2 focus-visible:ring-[#FFD50D] dark:border-zinc-700 dark:bg-zinc-900 dark:focus-visible:border-[#FFD50D]"
                onChange={(event) => setNote(event.target.value)}
                placeholder="Explain why the rejection should be reviewed."
                readOnly={!interactive}
                value={note}
              />
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400" id="appeal-help">
              You get one appeal. An Admin reviews it within two business days.
            </p>
            {error ? (
              <p className="text-sm font-semibold text-[#a01a26] dark:text-[#F04452]" role="alert">
                {error}
              </p>
            ) : null}
            <Button className="w-fit" disabled={!interactive} size="sm" type="submit">
              Submit appeal
            </Button>
          </form>
        ) : null}

        {submitted || (viewer.verification === "rejected" && viewer.appealCount > 0) ? (
          <p className="mt-4 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
            {submitted
              ? "Appeal submitted. You can keep browsing while an Admin reviews it."
              : "Your one appeal is with an Admin. Bidding and assignment stay closed until it is decided."}
          </p>
        ) : null}

        <div className="mt-5 flex gap-3 rounded-xl border border-zinc-200 p-3 text-sm leading-6 text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#D19300] dark:text-[#FFD50D]" />
          <div>
            <p className="font-semibold">TaskHive never accepts identity documents.</p>
            <p className="mt-1">
              The verification provider checks your identity and keeps the documents. TaskHive
              stores only the decision, a provider reference, and any appeal you write here.
            </p>
          </div>
        </div>

        {viewer.verification === "rejected" && viewer.appealCount > 0 ? (
          <p className="mt-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            <FileWarning className="h-3.5 w-3.5" /> Browse-only until the appeal is decided
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
