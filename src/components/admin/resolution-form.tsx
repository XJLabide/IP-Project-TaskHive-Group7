"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { resolutionLabel } from "@/lib/support/ui";
import type { SupportOutcome } from "@/lib/support/rules";

export type ResolutionKind = "cancellation" | "dispute" | "report" | "verification";

const fieldClass =
  "h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#D19300] focus:ring-2 focus:ring-[#FFC800]/25 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-[#FFD50D]";

const endpoints: Record<ResolutionKind, string> = {
  cancellation: "/api/admin/support/cancellations",
  dispute: "/api/admin/support/disputes",
  report: "/api/admin/support/reports",
  verification: "/api/admin/verifications",
};

export function ResolutionForm({
  kind,
  id,
}: {
  kind: ResolutionKind;
  id: string;
}) {
  const router = useRouter();
  const outcomes: SupportOutcome[] = [
    "FULL_REFUND",
    "PARTIAL_PAYOUT",
    "FULL_PAYOUT",
  ];
  const [outcome, setOutcome] = useState<string>(
    kind === "report" ? "dismiss" : kind === "verification" ? "approved" : "FULL_REFUND",
  );
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !window.confirm(
        `Apply “${outcome}” to this case? The decision is audited and cannot be undone.`,
      )
    ) {
      return;
    }

    setPending(true);
    setError("");
    setMessage("");

    try {
      const isVerification = kind === "verification";
      const isReport = kind === "report";
      const response = await fetch(`${endpoints[kind]}/${id}`, {
        method: isVerification ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          isVerification
            ? { outcome, reason: notes }
            : isReport
              ? { decision: outcome, notes }
              : {
                  outcome,
                  ...(outcome === "PARTIAL_PAYOUT"
                    ? { payoutCents: Math.round(Number(amount) * 100) }
                    : {}),
                  notes,
                },
        ),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(
          typeof body.error === "string"
            ? body.error
            : "Could not record the decision. Please try again.",
        );
        return;
      }

      setMessage("Decision recorded and audited.");
      router.refresh();
    } catch {
      setError("Could not record the decision. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-3 grid gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-700" onSubmit={handleSubmit}>
      <label className="grid gap-1 text-sm font-semibold">
        Decision
        <select
          className={fieldClass}
          onChange={(event) => setOutcome(event.target.value)}
          value={outcome}
        >
          {kind === "report"
            ? [
                ["dismiss", "Dismiss"],
                ["warn", "Uphold with warning"],
                ["suspend", "Suspend reported user"],
              ].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))
            : kind === "verification"
              ? [
                  ["approved", "Approve appeal"],
                  ["denied", "Deny appeal"],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))
              : outcomes.map((value) => (
                  <option key={value} value={value}>
                    {resolutionLabel(value)}
                  </option>
                ))}
        </select>
      </label>

      {kind !== "report" && kind !== "verification" && outcome === "PARTIAL_PAYOUT" ? (
        <label className="grid gap-1 text-sm font-semibold">
          Partial payout (PHP) — below the full payout
          <input
            className={fieldClass}
            min="0.01"
            onChange={(event) => setAmount(event.target.value)}
            required
            step="0.01"
            type="number"
            value={amount}
          />
        </label>
      ) : null}

      <label className="grid gap-1 text-sm font-semibold">
        Notes
        <textarea
          className="min-h-20 rounded-xl border border-zinc-200 bg-white p-3 text-sm font-normal outline-none focus:border-[#D19300] focus:ring-2 focus:ring-[#FFC800]/25 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-[#FFD50D]"
          onChange={(event) => setNotes(event.target.value)}
          required={kind === "verification" && outcome === "denied"}
          placeholder="Evidence considered and reason for the decision."
          value={notes}
        />
      </label>

      {error ? (
        <p className="text-sm font-medium text-[#a01a26] dark:text-[#F04452]" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          aria-live="polite"
          className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <Button className="w-fit" disabled={pending} size="sm" type="submit">
        {pending ? "Saving…" : "Apply decision"}
      </Button>
    </form>
  );
}
