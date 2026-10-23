import { Check, Circle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ViewerSnapshot } from "@/lib/viewer/presentation";

const requirements = [
  { key: "name", label: "Name", hint: "The name Posters and Taskers see." },
  { key: "verified email", label: "Verified email", hint: "Confirm the link we send to your inbox." },
  { key: "verified phone", label: "Verified phone", hint: "Confirm the code we text you." },
  { key: "18+ attestation", label: "18 or older", hint: "Required to post or apply for work." },
] as const;

/** The minimum participant profile, shown as a checklist rather than a form error. */
export function ProfileChecklist({ viewer }: { viewer: ViewerSnapshot }) {
  const remaining = requirements.filter((item) =>
    viewer.missingProfileFields.includes(item.key),
  ).length;

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#D19300] dark:text-[#FFD50D]">
              Basic profile
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">What posting and applying require</h2>
          </div>
          <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            {remaining === 0 ? "Complete" : `${remaining} left`}
          </span>
        </div>

        <ul className="mt-5 grid gap-2">
          {requirements.map((item) => {
            const done = !viewer.missingProfileFields.includes(item.key);
            return (
              <li
                className="flex items-start gap-3 rounded-xl border border-zinc-100 p-3 dark:border-zinc-800"
                key={item.key}
              >
                <span
                  aria-hidden="true"
                  className={
                    done
                      ? "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#75D333]/20 text-[#3f7d16] dark:text-[#75D333]"
                      : "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                  }
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="mt-0.5 block text-sm text-zinc-500 dark:text-zinc-400">
                    {item.hint}
                  </span>
                </span>
                <span className="ml-auto shrink-0 self-center text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  {done ? "Done" : "Needed"}
                </span>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 rounded-xl bg-zinc-50 p-3 text-sm leading-6 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
          One account can post and work. Guests can browse tasks, but posting, applying, and
          chatting need a signed-in account that meets every item above.
        </p>
      </CardContent>
    </Card>
  );
}
