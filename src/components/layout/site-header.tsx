import Link from "next/link";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", key: "home" },
  { href: "/tasks", label: "Browse tasks", key: "tasks" },
] as const;

/** Public site chrome shared by Home and guest-facing marketplace pages. */
export function SiteHeader({ active }: { active?: "home" | "tasks" }) {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/75 text-zinc-950 shadow-[0_1px_0_rgba(24,24,27,0.06)] backdrop-blur-md transition-colors dark:border-zinc-800/80 dark:bg-zinc-950/75 dark:text-zinc-50">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4 md:px-8 lg:px-12">
        <Link
          className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50"
          href="/"
        >
          <span className="text-yellow-500">Task</span>Hive
        </Link>

        <nav aria-label="Public navigation" className="hidden items-center gap-8 text-sm font-medium md:flex">
          {navItems.map((item) => (
            <Link
              aria-current={active === item.key ? "page" : undefined}
              className={cn(
                "transition-colors hover:text-yellow-500 dark:hover:text-yellow-300",
                active === item.key
                  ? "font-semibold text-zinc-950 dark:text-zinc-50"
                  : "text-zinc-700 dark:text-zinc-300",
              )}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 text-sm font-semibold md:gap-4">
          <Link
            className="text-zinc-700 transition-colors hover:text-yellow-500 dark:text-zinc-300 dark:hover:text-yellow-300"
            href="/login"
          >
            Log in
          </Link>
          <Link
            className="text-zinc-700 transition-colors hover:text-yellow-500 dark:text-zinc-300 dark:hover:text-yellow-300"
            href="/signup"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
