import { cn } from "@/lib/utils";

/**
 * A question-mark help affordance that keeps form rows the same height.
 * The panel opens on hover and on keyboard/touch focus, and stays in the DOM
 * so `aria-describedby` always resolves.
 */
export function HelpTip({
  id,
  label,
  children,
  className,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("group relative inline-flex align-middle", className)}>
      <button
        aria-describedby={id}
        aria-label={label}
        className="grid h-4 w-4 place-items-center rounded-full border border-zinc-300 text-[10px] font-bold leading-none text-zinc-500 outline-none transition-colors hover:border-[#D19300] hover:text-[#D19300] focus-visible:ring-2 focus-visible:ring-[#FFD50D] dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-[#FFC800] dark:hover:text-[#FFC800]"
        type="button"
      >
        ?
      </button>
      <span
        className="pointer-events-none absolute left-0 top-6 z-20 hidden w-60 rounded-lg border border-zinc-200 bg-white p-2 text-xs font-normal leading-5 text-zinc-600 shadow-lg group-hover:block group-focus-within:block dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        id={id}
        role="tooltip"
      >
        {children}
      </span>
    </span>
  );
}
