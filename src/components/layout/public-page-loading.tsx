import { PublicShell } from "@/components/layout/public-shell";

export function PublicPageLoading() {
  return (
    <PublicShell active={null} description="Opening the next page." title="Loading page">
      <div aria-busy="true" className="flex min-h-40 items-start gap-3 pt-4 text-sm text-zinc-600 dark:text-zinc-300" role="status">
        <span aria-hidden="true" className="mt-1 h-2 w-2 animate-pulse rounded-full bg-[#D19300] motion-reduce:animate-none dark:bg-[#FFC800]" />
        Opening TaskHive…
      </div>
    </PublicShell>
  );
}
