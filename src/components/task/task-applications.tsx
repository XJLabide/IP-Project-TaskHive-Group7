"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMarketplace } from "@/lib/mock-marketplace-store";
import {
  applicationStatusLabel,
  approvalFor,
} from "@/lib/applications/demo";
import {
  applicationStatusClass,
  verificationClass,
  verificationLabel,
} from "@/lib/applications/ui";
import { useViewer } from "@/components/viewer/viewer-provider";
import type { TaskSummary } from "@/lib/tasks/types";

export function TaskApplications({
  task,
  readOnly = false,
}: {
  task: TaskSummary;
  readOnly?: boolean;
}) {
  const { applicationsForTask } = useMarketplace();
  const { viewer } = useViewer();
  const [feedback, setFeedback] = useState("");
  const applications = applicationsForTask(task.id);

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No applications yet. Taskers can apply while the task is open.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      <p className="text-xs text-zinc-400">
        Demo: applications and verification states come from this browser session.
      </p>
      {feedback ? (
        <p
          aria-live="polite"
          className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300"
          role="status"
        >
          {feedback}
        </p>
      ) : null}

      {applications.map((application) => {
        const approval = approvalFor(
          application,
          task,
          application.tasker === viewer.displayName ? viewer.verification : undefined,
        );
        const selectable = approval.approvable && !readOnly && task.status === "open";

        return (
          <Card key={application.id}>
            <CardContent className="grid gap-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{application.tasker}</p>
                  <Badge className={verificationClass(application.verification)}>
                    {verificationLabel(application.verification)}
                  </Badge>
                  {application.status !== "submitted" ? (
                    <Badge className={applicationStatusClass(application.status)}>
                      {applicationStatusLabel(application.status)}
                    </Badge>
                  ) : null}
                </div>
                {application.amountCents !== null ? (
                  <p className="text-sm font-bold">
                    PHP {(application.amountCents / 100).toFixed(2)}
                  </p>
                ) : null}
              </div>

              {application.message ? (
                <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                  {application.message}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <span>
                  {application.kind === "bid" ? "Bid" : "Fixed-price request"}
                  {application.estimatedTime
                    ? ` · ${application.estimatedTime}`
                    : ""}
                </span>
                {!approval.approvable ? (
                  <span className="font-medium text-zinc-600 dark:text-zinc-300">
                    {approval.reason}
                  </span>
                ) : (
                  <Button
                    disabled={!selectable}
                    onClick={() =>
                      setFeedback(
                        "Demo: selecting a Tasker and starting the payment hold ship with the next milestone.",
                      )
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {readOnly ? "Task closed" : "Select Tasker"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
