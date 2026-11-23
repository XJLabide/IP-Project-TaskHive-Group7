import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { TaskLifecycleStatus } from "@/lib/tasks/lifecycle";

const stages = [
  { id: "open", label: "Posted" },
  { id: "pending_payment", label: "Tasker selected" },
  { id: "assigned", label: "Work underway" },
  { id: "awaiting_confirmation", label: "Review work" },
  { id: "completed", label: "Payout released" },
] as const;

const stageByStatus: Partial<Record<TaskLifecycleStatus, number>> = {
  open: 0,
  pending_approval: 0,
  pending_payment: 1,
  assigned: 2,
  in_progress: 2,
  awaiting_confirmation: 3,
  completed: 4,
};

export function TaskProgress({ status }: { status: TaskLifecycleStatus }) {
  const current = stageByStatus[status];
  const exceptional = ["cancelled", "cancellation_review", "disputed", "draft"].includes(status);

  return (
    <Card aria-label="Task progress">
      <CardContent className="grid gap-4 p-5">
        <div>
          <h2 className="font-bold">Task progress</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {exceptional
              ? status === "draft" ? "Publish this task when its details are ready." : `This task is ${status.replaceAll("_", " ").toLowerCase()}. See the task actions for next steps.`
              : current === 0 ? "Review applications and choose a Tasker to continue." : current === stages.length - 1 ? "This task is complete and the payout has been released." : `Next: ${stages[Math.min((current ?? 0) + 1, stages.length - 1)].label.toLowerCase()}.`}
          </p>
        </div>
        <ol className="grid gap-3 sm:grid-cols-5">
          {stages.map((stage, index) => {
            const done = current !== undefined && index < current;
            const active = current === index;
            return (
              <li aria-current={active ? "step" : undefined} className="flex items-center gap-2 sm:grid sm:content-start sm:gap-2" key={stage.id}>
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-bold ${done ? "border-[#D19300] bg-[#FFD50D] text-zinc-950" : active ? "border-[#D19300] text-[#9A6500] dark:border-[#FFD50D] dark:text-[#FFD50D]" : "border-zinc-300 text-zinc-400 dark:border-zinc-700"}`}>
                  {done ? <Check aria-hidden="true" className="h-4 w-4" /> : index + 1}
                </span>
                <span className={`text-sm ${active ? "font-semibold text-zinc-950 dark:text-zinc-50" : "text-zinc-500 dark:text-zinc-400"}`}>{stage.label}</span>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
