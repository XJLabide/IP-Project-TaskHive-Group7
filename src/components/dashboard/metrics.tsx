import Link from "next/link";
import type { DashboardMetric } from "@/lib/dashboard/ui";

const cardClass =
  "flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-5 text-zinc-950 transition-colors hover:border-[#D19300] hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD50D] focus-visible:ring-offset-2 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/60 dark:focus-visible:ring-offset-zinc-950";

export function MetricGrid({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <section aria-label="Workspace metrics">
      <ul className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map((metric) => (
          <li className="h-full" key={metric.id}>
            <Link className={cardClass} href={metric.href}>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
                {metric.label}
              </p>
              <p className="mt-3 text-3xl font-bold leading-none tracking-tight">
                {metric.value}
              </p>
              <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                {metric.context}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
