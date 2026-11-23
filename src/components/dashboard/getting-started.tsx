import Link from "next/link";
import { ArrowRight, Check, Circle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ViewerSnapshot } from "@/lib/viewer/presentation";

type SetupStep = {
  label: string;
  complete: boolean;
  href: string;
  action: string;
};

/** First-run account setup, with clear gates for participation and assignment. */
export function GettingStarted({ viewer }: { viewer: ViewerSnapshot }) {
  const missing = new Set(viewer.missingProfileFields);
  const basicSteps: SetupStep[] = [
    { label: "Add your name", complete: !missing.has("name"), href: "/profile#contact-details", action: "Add name" },
    { label: "Verify your email", complete: viewer.emailVerified, href: "/verify-email", action: "Verify email" },
    { label: "Confirm you’re 18 or older", complete: !missing.has("18+ attestation"), href: "/profile#age-attestation", action: "Confirm age" },
  ];
  const completedCount = basicSteps.filter((step) => step.complete).length;
  const identityVerified = viewer.verification === "verified";
  const identityLabel = identityVerified
    ? "Verified"
    : viewer.verification === "pending"
      ? "In review"
      : viewer.verification === "rejected" && viewer.appealCount > 0
        ? "Appeal in review"
        : viewer.verification === "rejected"
          ? "Needs attention"
          : "Not started";
  const identityDescription = identityVerified
    ? "You can be assigned to Tasker work."
    : viewer.verification === "pending"
      ? "Your provider is reviewing the check. You can browse and apply while it is pending."
      : viewer.verification === "rejected"
        ? viewer.appealCount > 0
          ? "Your appeal is with an Admin. Assignment stays closed while it is reviewed."
          : "Review the result and submit your one available appeal if needed."
        : "Needed before a Poster can assign you to a task. You can browse and apply before then.";

  if (completedCount === basicSteps.length && identityVerified) return null;

  return (
    <section aria-labelledby="getting-started-title" className="rounded-xl border border-amber-200 bg-white p-5 dark:border-amber-300/20 dark:bg-zinc-900 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9A6500] dark:text-[#FFD50D]">Getting started</p>
          <h2 className="mt-1 text-lg font-bold tracking-tight" id="getting-started-title">Set up your TaskHive account</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{completedCount} of {basicSteps.length} steps complete for posting and applying.</p>
        </div>
        <Button asChild size="sm" variant="outline"><Link href="/profile">View profile <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link></Button>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {basicSteps.map((step) => (
          <li className="flex min-w-0 items-center gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800" key={step.label}>
            <span aria-hidden="true" className={step.complete ? "grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300" : "grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200"}>
              {step.complete ? <Check className="h-4 w-4" /> : <Circle className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{step.label}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{step.complete ? "Complete" : "Needed"}</p>
            </div>
            {!step.complete && <Link className="shrink-0 text-xs font-semibold text-[#835700] underline underline-offset-4 dark:text-[#FFD50D]" href={step.href}>{step.action}</Link>}
          </li>
        ))}
      </ul>

      {!identityVerified && (
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex min-w-0 gap-3">
            <ShieldCheck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#9A6500] dark:text-[#FFD50D]" />
            <div className="min-w-0"><p className="text-sm font-semibold">Tasker identity check <span className="font-medium text-zinc-500 dark:text-zinc-400">· {identityLabel}</span></p><p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-400">{identityDescription}</p></div>
          </div>
          <Link className="shrink-0 text-xs font-semibold text-[#835700] underline underline-offset-4 dark:text-[#FFD50D]" href="/dashboard#verification">{viewer.verification === "not_started" ? "Start check" : "View status"}</Link>
        </div>
      )}

      <p className="mt-3 text-xs leading-5 text-zinc-500 dark:text-zinc-400">You can browse tasks now. Your name, verified email, and 18+ confirmation unlock posting and applying; identity verification is required before assignment.</p>
    </section>
  );
}
