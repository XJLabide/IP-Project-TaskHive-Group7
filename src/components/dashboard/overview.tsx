import Link from "next/link";
import {
  Check,
  ClipboardList,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardHero({ canPost }: { canPost: boolean }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-[#F2F5F9] dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col justify-between gap-7 p-6 sm:p-8 lg:flex-row lg:items-center lg:px-9 lg:py-8">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
            Find tasks, earn on your time.
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
            Post a task, compare offers, and hire trusted workers from your community.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {canPost ? (
              <Button asChild>
                <Link href="/tasks/new">Post a task</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/profile">Complete your profile</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/tasks">Browse open tasks</Link>
            </Button>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="hidden shrink-0 items-center justify-center gap-3 lg:flex"
        >
          <span className="grid h-16 w-16 -rotate-6 place-items-center rounded-2xl border border-slate-200 bg-white text-[#B77900] dark:border-zinc-700 dark:bg-zinc-800 dark:text-[#FFD50D]">
            <ClipboardList className="h-8 w-8" strokeWidth={1.8} />
          </span>
          <span className="-mt-8 grid h-11 w-11 place-items-center rounded-full bg-[#FFC800] text-zinc-950">
            <Check className="h-6 w-6" strokeWidth={2.4} />
          </span>
          <span className="mt-7 grid h-14 w-14 place-items-center rounded-2xl border border-slate-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            <MessageSquare className="h-7 w-7" strokeWidth={1.8} />
          </span>
        </div>
      </div>
    </section>
  );
}
const steps = [
  {
    title: "Post your task",
    description: "What you need, where, and your budget.",
    Icon: ClipboardList,
  },
  {
    title: "Compare offers",
    description: "Check price and verification before you choose.",
    Icon: MessageSquare,
  },
  {
    title: "Hire, then pay",
    description: "Pay when you hire; release when the work is done.",
    Icon: ShieldCheck,
  },
] as const;

export function HowTaskHiveWorks() {
  return (
    <section
      aria-labelledby="how-taskhive-works-title"
      className="rounded-3xl border border-[#F0EAD9] bg-[#FFFDF7] px-5 py-6 dark:border-zinc-800 dark:bg-[#17150F] sm:px-8"
    >
      <h2
        className="text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-50"
        id="how-taskhive-works-title"
      >
        How TaskHive works
      </h2>
      <ol className="mt-5 grid gap-5 md:grid-cols-3 md:gap-4">
        {steps.map(({ title, description, Icon }, index) => (
          <li className="flex items-start gap-3" key={title}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#FFC800] text-sm font-bold text-zinc-950">
              {index + 1}
            </span>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-zinc-800 ring-1 ring-slate-200 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700">
              <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="block text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                {title}
              </span>
              <span className="mt-1 block text-sm leading-5 text-zinc-600 dark:text-zinc-400">
                {description}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
