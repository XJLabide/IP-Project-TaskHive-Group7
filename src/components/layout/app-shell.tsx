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
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f7f5]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-zinc-200 bg-white md:block">
        <Link href="/" className="flex h-16 items-center gap-3 border-b border-zinc-200 px-5">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-zinc-950 text-xs font-bold text-white">
            TH
          </span>
          <span className="font-semibold tracking-tight">TaskHive</span>
        </Link>
        <nav className="grid gap-1 p-3">
          {navItems.map((item) => (
            <Link
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
              href={item.href}
              key={item.href}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-200 p-4">
          <div className="flex items-center gap-3 rounded-lg bg-zinc-50 p-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-zinc-200 text-xs font-semibold">
              AR
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">Ana Reyes</p>
              <p className="truncate text-xs text-zinc-500">Poster and Tasker</p>
            </div>
          </div>
        </div>
      </aside>
      <div className="md:pl-64">
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 px-5 py-4 backdrop-blur">
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
        </header>
        <main className="p-5 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
