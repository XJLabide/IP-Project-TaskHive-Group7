import { Badge } from "@/components/ui/badge";
import type { StatusTone } from "@/lib/dashboard/ui";
import { cn } from "@/lib/utils";

const toneClass: Record<StatusTone, string> = {
  positive:
    "border-[#75D333]/40 bg-[#75D333]/15 text-[#2f6b12] dark:text-[#75D333]",
  pending:
    "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100",
  negative:
    "border-[#F04452]/40 bg-[#F04452]/10 text-[#a01a26] dark:text-[#F04452]",
  neutral:
    "border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
};

/** Status always carries a word, so color is never the only signal. */
export function StatusChip({
  tone = "neutral",
  className,
  children,
}: {
  tone?: StatusTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Badge className={cn(toneClass[tone], className)}>{children}</Badge>
  );
}
