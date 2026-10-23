import { UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { verificationSummary } from "@/lib/viewer/presentation";
import type { TaskerVerificationStatus } from "@/lib/domain/access";

type Applicant = {
  id: string;
  name: string;
  offer: number;
  note: string;
  verification: TaskerVerificationStatus;
};

const applicants: Applicant[] = [
  {
    id: "app_verified",
    name: "Marco Cruz",
    offer: 450,
    note: "I live nearby and can start now.",
    verification: "verified",
  },
  {
    id: "app_pending",
    name: "Ana Reyes",
    offer: 430,
    note: "I can deliver before 5 PM.",
    verification: "pending",
  },
];

/**
 * Poster-side application list. A pending Tasker is visible and clearly labelled,
 * but the selection control stays disabled until the identity check passes.
 */
export function ApplicantList() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold">Applicants</h2>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">{applicants.length} applicants</span>
        </div>

        <ul className="mt-4 grid gap-3">
          {applicants.map((applicant) => {
            const summary = verificationSummary({
              status: applicant.verification,
              appealCount: 0,
            });
            const assignable = summary.tone === "positive";

            return (
              <li
                className="grid gap-3 rounded-xl border border-zinc-100 p-4 dark:border-zinc-800"
                key={applicant.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">{applicant.name}</p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{applicant.note}</p>
                  </div>
                  <p className="text-sm font-bold">PHP {applicant.offer}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={
                      assignable
                        ? "border-[#75D333]/40 bg-[#75D333]/15 text-[#2f6b12] dark:text-[#75D333]"
                        : "border-[#FFC800]/40 bg-[#FFD50D]/25 text-zinc-800 dark:bg-[#FFC800]/15 dark:text-zinc-100"
                    }
                  >
                    {summary.label}
                  </Badge>
                  <Button
                    className="ml-auto"
                    disabled={!assignable}
                    size="sm"
                    type="button"
                    variant={assignable ? "default" : "outline"}
                  >
                    <UserCheck className="h-4 w-4" />
                    {assignable ? "Select Tasker" : "Cannot assign yet"}
                  </Button>
                </div>

                {!assignable ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Applications stay visible, but assignment opens only after identity
                    verification.
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
