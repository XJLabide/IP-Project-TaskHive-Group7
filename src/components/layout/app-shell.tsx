import Link from "next/link";
import {
  Bell,
  ClipboardList,
  LayoutDashboard,
  Plus,
  Search,
  Shield,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Browse Tasks", icon: Search },
  { href: "/tasks/new", label: "Create Task", icon: Plus },
  { href: "/reviews", label: "Reviews", icon: Star },
  { href: "/admin", label: "Admin", icon: Shield },
];

export function AppShell({
  title,
  description,
  children,
  showHeader = true,
  contentClassName,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  showHeader?: boolean;
  contentClassName?: string;
}) {
  return (
    <div className="min-h-screen bg-white">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[283px] flex-col bg-[#afafaf] px-[18px] pt-12 lg:flex">
        <Link href="/" className="mb-[78px] h-9 px-10 text-[30px] font-bold leading-9 tracking-tight text-zinc-950">
          TaskHive
        </Link>
        <nav aria-label="Main navigation" className="grid gap-[19px]">
          {navItems.map((item) => (
            <Link
              aria-current={item.href === activeHref(title) ? "page" : undefined}
              className={cn(
                "flex h-[35px] items-center gap-3 rounded-full px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-white/80",
                item.href === activeHref(title) && "bg-white/80",
              )}
              href={item.href}
              key={item.href}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto mb-[18px] flex h-[77px] items-center gap-3 rounded-2xl bg-zinc-200 px-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#afafaf] text-xs font-semibold">
              AR
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">Ana Reyes</p>
              <p className="truncate text-xs text-zinc-500">Poster and Tasker</p>
            </div>
        </div>
      </aside>
      <header className="border-b border-zinc-300 bg-[#afafaf] px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <Link className="text-xl font-bold text-zinc-950" href="/">TaskHive</Link>
          <nav aria-label="Main navigation" className="flex gap-2 overflow-x-auto">
            {navItems.slice(0, 4).map((item) => (
              <Link className="whitespace-nowrap rounded px-3 py-2 text-sm text-zinc-900 hover:bg-white/50" href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="lg:ml-[283px]">
        {showHeader && <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
              <p className="mt-1 text-sm text-zinc-600">{description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden h-10 w-72 items-center gap-2 rounded-lg border border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-500 xl:flex">
                <Search className="h-4 w-4" />
                Search tasks, people, messages
              </div>
              <Button variant="outline" size="sm" aria-label="Notifications">
                <Bell className="h-4 w-4" />
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/tasks">
                  <ClipboardList className="h-4 w-4" />
                  Browse
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/tasks/new">
                  <Plus className="h-4 w-4" />
                  Create
                </Link>
              </Button>
            </div>
          </div>
        </header>}
        <main className={cn("p-5 lg:p-6", contentClassName)}>{children}</main>
      </div>
    </div>
  );
}

function activeHref(title: string) {
  if (title === "Dashboard") return "/dashboard";
  if (title === "Browse Tasks") return "/tasks";
  if (title === "Create Task") return "/tasks/new";
  if (title === "Two-Way Reviews") return "/reviews";
  if (title === "Global Admin") return "/admin";
  return "/tasks";
}
