import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { ApplicantList } from "@/components/viewer/applicant-list";
import { GateNotice } from "@/components/viewer/gate-notice";
import { ProfileChecklist } from "@/components/viewer/profile-checklist";
import { StatePreview } from "@/components/viewer/state-preview";
import { VerificationCard } from "@/components/viewer/verification-card";
import { demoViewers } from "@/lib/viewer/demo";

const gateCodes = [
  "sign_in_required",
  "profile_incomplete",
  "verification_required",
  "verification_rejected",
  "appeal_already_used",
] as const;

export default function PreviewPage() {
  return (
    <AppShell
      title="State preview"
      description="Every guest gate and verification state, rendered without a backend session."
    >
      <Card>
        <CardContent className="p-5 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          <p className="font-bold text-zinc-950 dark:text-zinc-50">Prototype preview</p>
          <p className="mt-2">
            The verification provider is not connected in this build. This page renders the same
            components the real screens use, so each state can be reviewed without changing an
            account. Controls are disabled here; nothing is saved.
          </p>
          <p className="mt-2">
            To walk the whole app in one state, add <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">?as=pending</code>,{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">?as=rejected</code>, or{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">?as=verified</code>{" "}
            to any page. Nothing is stored server-side.
          </p>
          <div className="mt-4 max-w-xs">
            <StatePreview />
          </div>
        </CardContent>
      </Card>

      <section className="mt-8">
        <h2 className="text-xl font-bold tracking-tight">Guest and profile gates</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {gateCodes.map((code) => (
            <GateNotice code={code} key={code} />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold tracking-tight">Basic profile</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          A signed-in account that has verified email but still needs the 18+ attestation.
        </p>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <ProfileChecklist viewer={demoViewers.incomplete} />
          <ProfileChecklist viewer={demoViewers.verified} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold tracking-tight">Tasker verification states</h2>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <VerificationCard interactive={false} viewer={demoViewers.incomplete} />
          <VerificationCard interactive={false} viewer={demoViewers.pending} />
          <VerificationCard interactive={false} viewer={demoViewers.rejected} />
          <VerificationCard interactive={false} viewer={demoViewers.appealed} />
          <VerificationCard interactive={false} viewer={demoViewers.verified} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold tracking-tight">Poster view of applicants</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          A pending-verification application stays visible but cannot be approved.
        </p>
        <div className="mt-4 max-w-2xl">
          <ApplicantList />
        </div>
      </section>
    </AppShell>
  );
}
