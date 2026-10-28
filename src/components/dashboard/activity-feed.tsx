import Link from "next/link";
import { formatChatTime } from "@/lib/chat/demo";
import type { DashboardActivity } from "@/lib/dashboard/data";
import { EmptyRow, Panel } from "@/components/dashboard/panels";

export function ActivityFeed({ items }: { items: DashboardActivity[] }) {
  return (
    <Panel
      description="The latest applications, payments, and messages."
      id="activity"
      title="Recent activity"
      count={items.length}
    >
      {items.length === 0 ? (
        <EmptyRow title="Your activity will appear here">
          Applications, payments, and messages will be collected in this timeline.
        </EmptyRow>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                className="flex gap-3 p-4 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD50D] focus-visible:ring-inset dark:hover:bg-zinc-800/50"
                href={item.href}
              >
                <span
                  aria-hidden="true"
                  className={
                    item.kind === "payment_completed"
                      ? "mt-2 h-2 w-2 shrink-0 rounded-full bg-[#75D333]"
                      : "mt-2 h-2 w-2 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600"
                  }
                />
                <span className="min-w-0">
                  <span className="block text-sm leading-6 text-zinc-700 dark:text-zinc-200">
                    {item.description}
                  </span>
                  <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                    {formatChatTime(item.createdAt)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
