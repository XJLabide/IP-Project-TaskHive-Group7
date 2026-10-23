import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/**
 * Chrome for guest-facing marketplace pages: the same header and footer as
 * Home, so browsing tasks continues the public site sequence instead of
 * dropping visitors into the signed-in workspace.
 */
export function PublicShell({
  title,
  description,
  active = "tasks",
  children,
}: {
  title: string;
  description: string;
  active?: "home" | "tasks";
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-white text-zinc-950 transition-colors duration-200 dark:bg-zinc-950 dark:text-zinc-50">
      <SiteHeader active={active} />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-10 md:px-8 lg:px-12">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#D19300] dark:text-[#FFD50D]">
            TaskHive marketplace
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            {description}
          </p>
        </header>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
