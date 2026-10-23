"use client";

import { Check, Mail, Phone, UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { GateNotice } from "@/components/viewer/gate-notice";
import { ProfileChecklist } from "@/components/viewer/profile-checklist";
import { StatePreview } from "@/components/viewer/state-preview";
import { VerificationCard } from "@/components/viewer/verification-card";
import { useViewer } from "@/components/viewer/viewer-provider";

export default function ProfilePage() {
  const { viewer, startVerification, submitAppeal } = useViewer();

  if (!viewer.signedIn) {
    return (
      <AppShell title="Profile" description="Your basic profile, contact verification, and Tasker identity check.">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <GateNotice code="sign_in_required" />
          <Card>
            <CardContent className="grid gap-3 p-5 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              <p className="font-bold text-zinc-950 dark:text-zinc-50">Why this page is private</p>
              <p>
                Account pages hold contact details and verification state. Guests can browse
                public tasks, but TaskHive does not render private account data until you sign in.
              </p>
              <StatePreview />
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  const emailDone = !viewer.missingProfileFields.includes("verified email");
  const phoneDone = !viewer.missingProfileFields.includes("verified phone");

  return (
    <AppShell title="Profile" description="Your basic profile, contact verification, and Tasker identity check.">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-6">
          <ProfileChecklist viewer={viewer} />
          <VerificationCard
            onStartVerification={startVerification}
            onSubmitAppeal={submitAppeal}
            viewer={viewer}
          />
        </div>

        <aside className="grid content-start gap-4">
          <Card>
            <CardContent className="grid gap-4 p-5">
              <p className="text-sm font-bold">Contact details</p>
              <ContactRow
                done={viewer.displayName !== null}
                icon={<UserRound className="h-4 w-4" />}
                label="Name"
                value={viewer.displayName ?? "Not added"}
              />
              <ContactRow
                done={emailDone}
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={emailDone ? "Verified" : "Verification needed"}
              />
              <ContactRow
                done={phoneDone}
                icon={<Phone className="h-4 w-4" />}
                label="Phone"
                value={phoneDone ? "Verified" : "Verification needed"}
              />
              <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                Posting and applying stay locked until every item is complete.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-bold">Review every state</p>
              <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                Preview the pending, rejected, appeal, and verified views without changing your
                account.
              </p>
              <StatePreview className="mt-4" />
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}

function ContactRow({
  done,
  icon,
  label,
  value,
}: {
  done: boolean;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-zinc-400">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
      {done ? (
        <Badge className="ml-auto border-[#75D333]/40 bg-[#75D333]/15 text-[#2f6b12] dark:text-[#75D333]">
          <Check className="mr-1 h-3 w-3" /> Done
        </Badge>
      ) : (
        <Badge className="ml-auto">Needed</Badge>
      )}
    </div>
  );
}
