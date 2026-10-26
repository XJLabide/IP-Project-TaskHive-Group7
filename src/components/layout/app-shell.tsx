"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LayoutDashboard, LogIn, Plus, Search, Shield, Star, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOutFromTaskHive } from "@/lib/auth/client";
import { useViewer } from "@/components/viewer/viewer-provider";
import { verificationSummary } from "@/lib/viewer/presentation";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const browseItem: NavItem = { href: "/tasks", label: "Browse tasks", icon: Search };
const dashboardItem: NavItem = { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard };
const createTaskItem: NavItem = { href: "/tasks/new", label: "Create task", icon: Plus };
const reviewsItem: NavItem = { href: "/reviews", label: "Reviews", icon: Star };
const profileItem: NavItem = { href: "/profile", label: "Profile", icon: UserRound };
const adminItem: NavItem = { href: "/admin", label: "Admin", icon: Shield };

export function AppShell({ title, description, children, showHeader = true, contentClassName }: { title: string; description: string; children: React.ReactNode; showHeader?: boolean; contentClassName?: string }) {
  const { viewer } = useViewer();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  async function handleSignOut() {
    setSigningOut(true);
    setSignOutError("");
    try {
      await signOutFromTaskHive();
      router.push("/");
      router.refresh();
    } catch {
      setSignOutError("Could not finish signing out. Please try again.");
      setSigningOut(false);
    }
  }
  const active = activeHref(title);
  const navItems: NavItem[] = viewer.signedIn
    ? [
        dashboardItem,
        ...(viewer.canPost ? [createTaskItem] : []),
        reviewsItem,
        profileItem,
        ...(viewer.isAdmin ? [adminItem] : []),
      ]
    : [browseItem];

  const identity = viewer.signedIn ? viewer.displayName ?? "Signed in" : "Guest";
  const identityDetail = viewer.signedIn
    ? verificationSummary({ status: viewer.verification, appealCount: viewer.appealCount }).label
    : "Browsing only";
  const initials = viewer.signedIn ? (viewer.displayName ?? "TH").split(" ").map((part) => part[0]).join("").slice(0, 2) : "?";

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-zinc-200 bg-white px-4 py-6 dark:border-zinc-800 dark:bg-zinc-950 lg:flex">
        <Link href="/" className="flex items-center gap-2 px-3 text-2xl font-bold tracking-tight"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#FFC800] text-base text-zinc-950">T</span><span><span className="text-[#FFC800]">Task</span>Hive</span></Link>
        <p className="mt-10 px-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">Workspace</p>
        <nav aria-label="Main navigation" className="mt-3 grid gap-1.5">
          {navItems.map((item) => {
            const selected = item.href === active;
            return <Link aria-current={selected ? "page" : undefined} className={cn("flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors", selected ? "bg-[#FFD50D]/30 text-zinc-950 dark:bg-[#FFC800]/15 dark:text-zinc-50" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50")} href={item.href} key={item.href}><item.icon className={cn("h-4 w-4", selected && "text-[#D19300] dark:text-[#FFD50D]")} />{item.label}</Link>;
          })}
        </nav>
        <div className="mt-auto mb-3 flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Theme</span>
          <ThemeToggle />
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-950">{initials}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{identity}</p><p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{identityDetail}</p></div></div>{signOutError ? <p className="mt-2 text-xs text-[#a01a26] dark:text-[#F04452]" role="alert">{signOutError}</p> : null}{viewer.signedIn ? (
          <Button className="mt-3 w-full" disabled={signingOut} onClick={handleSignOut} size="sm" type="button" variant="outline">
            {signingOut ? "Signing out…" : "Sign out"}
          </Button>
        ) : (
          <Button asChild className="mt-3 w-full" size="sm"><Link href="/login">Sign in to act</Link></Button>
        )}</div>
      </aside>
      <header className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 lg:hidden"><div className="flex items-center justify-between gap-3"><Link className="flex items-center gap-2 text-lg font-bold tracking-tight" href="/"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#FFC800] text-sm text-zinc-950">T</span><span><span className="text-[#FFC800]">Task</span>Hive</span></Link><div className="flex items-center gap-2"><ThemeToggle />{viewer.canPost ? <Button asChild size="sm"><Link href="/tasks/new"><Plus className="h-4 w-4" />Create</Link></Button> : !viewer.signedIn ? <Button asChild size="sm"><Link href="/login"><LogIn className="h-4 w-4" />Sign in</Link></Button> : <Button asChild size="sm" variant="outline"><Link href="/profile"><UserRound className="h-4 w-4" />Profile</Link></Button>}</div></div><nav aria-label="Main navigation" className="mt-3 flex gap-2 overflow-x-auto pb-1">{navItems.map((item) => { const selected = item.href === active; return <Link aria-current={selected ? "page" : undefined} className={cn("inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium", selected ? "bg-[#FFD50D]/30 text-zinc-950 dark:bg-[#FFC800]/15 dark:text-zinc-50" : "text-zinc-600 dark:text-zinc-400")} href={item.href} key={item.href}><item.icon className="h-4 w-4" />{item.label}</Link>; })}</nav></header>
      <div className="lg:ml-64">
        {showHeader && <header className="sticky top-0 z-10 border-b border-zinc-200/90 bg-white/90 px-5 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90 sm:px-7"><div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#D19300] dark:text-[#FFD50D]">TaskHive workspace</p><h1 className="mt-1 text-xl font-bold tracking-tight">{title}</h1><p className="mt-1 hidden text-sm text-zinc-500 dark:text-zinc-400 sm:block">{description}</p></div><div className="flex items-center gap-2"><div className="hidden h-10 w-64 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 xl:flex"><Search className="h-4 w-4" />Search workspace</div><Button variant="outline" size="sm" aria-label="Notifications"><Bell className="h-4 w-4" /></Button>{viewer.canPost ? <Button asChild className="hidden sm:inline-flex" size="sm"><Link href="/tasks/new"><Plus className="h-4 w-4" />Create task</Link></Button> : !viewer.signedIn ? <Button asChild className="hidden sm:inline-flex" size="sm"><Link href="/login"><LogIn className="h-4 w-4" />Sign in to post</Link></Button> : <Button asChild className="hidden sm:inline-flex" size="sm" variant="outline"><Link href="/profile"><UserRound className="h-4 w-4" />Complete profile</Link></Button>}</div></div></header>}
        <main className={cn("mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-8", contentClassName)}>{children}</main>
      </div>
    </div>
  );
}

function activeHref(title: string) { if (title === "Dashboard") return "/dashboard"; if (title === "Browse Tasks") return "/tasks"; if (title === "Create Task") return "/tasks/new"; if (title === "Two-Way Reviews") return "/reviews"; if (title === "Global Admin") return "/admin"; if (title === "Profile") return "/profile"; return "/tasks"; }
