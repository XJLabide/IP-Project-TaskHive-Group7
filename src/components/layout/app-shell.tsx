"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, BriefcaseBusiness, ChevronLeft, CreditCard, FileText, LayoutDashboard, LogIn, Map, Menu, MessageSquare, Plus, Search, Shield, Star, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOutFromTaskHive } from "@/lib/auth/client";
import { useViewer } from "@/components/viewer/viewer-provider";
import { TaskHiveBrand } from "@/components/layout/taskhive-brand";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

const browseItem: NavItem = { href: "/tasks", label: "Browse tasks", icon: Search };
const mapItem: NavItem = { href: "/map", label: "View map", icon: Map };
const dashboardItem: NavItem = { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard };
const paymentsItem: NavItem = { href: "/checkout", label: "Payments", icon: CreditCard };
const myWorkItem: NavItem = { href: "/my-work", label: "My Work", icon: BriefcaseBusiness };
const createTaskItem: NavItem = { href: "/tasks/new", label: "Create task", icon: Plus };
const reviewsItem: NavItem = { href: "/reviews", label: "Reviews", icon: Star };
const applicationsItem: NavItem = { href: "/applications", label: "My applications", icon: FileText };
const messagesItem: NavItem = { href: "/chats", label: "Chat inbox", icon: MessageSquare };
const notificationsItem: NavItem = { href: "/notifications", label: "Notifications", icon: Bell };
const profileItem: NavItem = { href: "/profile", label: "Profile", icon: UserRound };
const adminItem: NavItem = { href: "/admin", label: "Admin", icon: Shield };

export function AppShell({ title, description, children, showHeader = true, showMobilePrimaryAction = true, contentClassName }: { title: string; description: string; children: React.ReactNode; showHeader?: boolean; showMobilePrimaryAction?: boolean; contentClassName?: string }) {
  const { viewer } = useViewer();
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const navItems: NavItem[] = viewer.signedIn
    ? [dashboardItem, browseItem, mapItem, myWorkItem, paymentsItem, ...(viewer.canPost ? [createTaskItem] : []), applicationsItem, messagesItem, notificationsItem, reviewsItem, profileItem, ...(viewer.isAdmin ? [adminItem] : [])]
    : [browseItem, mapItem];
  const identity = viewer.displayName ?? (viewer.signedIn ? "Signed in" : "Guest");
  const identityDetail = viewer.signedIn ? (viewer.canPost ? "Profile complete" : "Profile setup needed") : "Browsing only";
  const initials = viewer.signedIn ? (viewer.displayName ?? "TH").split(" ").map((part) => part[0]).join("").slice(0, 2) : "?";
  const sidebarWidth = collapsed ? "lg:w-20" : "lg:w-64";
  const mainOffset = collapsed ? "lg:ml-20" : "lg:ml-64";

  function navigation(isMobile = false) {
    return navItems.map((item) => {
      const selected = pathname === item.href || (pathname.startsWith(`${item.href}/`) && !(item.href === "/tasks" && pathname === "/tasks/new"));
      return <Link aria-current={selected ? "page" : undefined} aria-label={collapsed && !isMobile ? item.label : undefined} className={cn("flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors", collapsed && !isMobile && "justify-center px-0", selected ? "bg-[#FFD50D]/30 text-zinc-950 dark:bg-[#FFC800]/15 dark:text-zinc-50" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50")} href={item.href} key={item.href} onClick={() => setDrawerOpen(false)} title={collapsed && !isMobile ? item.label : undefined}><item.icon aria-hidden="true" className={cn("h-4 w-4 shrink-0", selected && "text-[#D19300] dark:text-[#FFD50D]")} />{(!collapsed || isMobile) && <span>{item.label}</span>}</Link>;
    });
  }

  const primaryAction = viewer.canPost
    ? <Button asChild size="sm"><Link href="/tasks/new"><Plus aria-hidden="true" className="h-4 w-4" /><span className="hidden sm:inline">Post a Task</span><span className="sm:hidden">Post</span></Link></Button>
    : !viewer.signedIn
      ? <Button asChild size="sm"><Link href="/login"><LogIn aria-hidden="true" className="h-4 w-4" />Sign in</Link></Button>
      : <Button asChild size="sm" variant="outline"><Link href="/profile"><UserRound aria-hidden="true" className="h-4 w-4" />Complete profile</Link></Button>;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <aside className={cn("fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-zinc-200 bg-white px-3 py-5 transition-[width] duration-200 dark:border-zinc-800 dark:bg-zinc-950 lg:flex", sidebarWidth)}>
        <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between px-2")}>
          {collapsed ? <TaskHiveBrand className="text-[0]" iconClassName="h-8 w-8" showName={false} /> : <TaskHiveBrand className="text-xl" iconClassName="h-8 w-8" />}
          <button aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-pressed={collapsed} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD50D] dark:hover:bg-zinc-900" onClick={() => setCollapsed((value) => !value)} type="button"><ChevronLeft aria-hidden="true" className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} /></button>
        </div>
        {!collapsed && <p className="mb-2 mt-8 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">Workspace</p>}
        <nav aria-label="Main navigation" className="mt-5 grid gap-1">{navigation()}</nav>
        <div className={cn("mt-auto mb-3 flex items-center rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900", collapsed ? "justify-center" : "justify-between")}>
          {!collapsed && <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Theme</span>}<ThemeToggle />
        </div>
        <div className={cn("rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900", collapsed && "flex justify-center border-0 bg-transparent p-0 dark:bg-transparent")}>
          <div className={cn("flex items-center gap-3", collapsed && "justify-center")}><div aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-950">{initials}</div>{!collapsed && <div className="min-w-0"><p className="truncate text-sm font-semibold">{identity}</p><p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{identityDetail}</p></div>}</div>
          {!collapsed && <>{signOutError && <p className="mt-2 text-xs text-[#a01a26] dark:text-[#F04452]" role="alert">{signOutError}</p>}{viewer.signedIn && <Button className="mt-3 w-full" disabled={signingOut} onClick={handleSignOut} size="sm" type="button" variant="outline">{signingOut ? "Signing out…" : "Sign out"}</Button>}</>}
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <button aria-expanded={drawerOpen} aria-label={drawerOpen ? "Close navigation menu" : "Open navigation menu"} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-zinc-700 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD50D] dark:text-zinc-200 dark:hover:bg-zinc-900" onClick={() => setDrawerOpen((open) => !open)} type="button">{drawerOpen ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}</button>
          <TaskHiveBrand className="mr-auto text-lg" iconClassName="h-8 w-8" />
          <ThemeToggle />{showMobilePrimaryAction && primaryAction}
        </div>
      </header>

      {drawerOpen && <div className="fixed inset-0 z-40 lg:hidden" role="presentation"><button aria-label="Close navigation menu" className="absolute inset-0 bg-zinc-950/45" onClick={() => setDrawerOpen(false)} type="button" /><nav aria-label="Mobile navigation" className="relative flex h-full w-[min(20rem,86vw)] flex-col border-r border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"><div className="flex items-center justify-between"><TaskHiveBrand className="text-xl" iconClassName="h-8 w-8" /><button aria-label="Close navigation menu" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900" onClick={() => setDrawerOpen(false)} type="button"><X aria-hidden="true" className="h-5 w-5" /></button></div><p className="mb-2 mt-8 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">Workspace</p><div className="grid gap-1">{navigation(true)}</div><div className="mt-auto border-t border-zinc-200 pt-4 dark:border-zinc-800"><div className="mb-4 flex items-center justify-between"><span className="text-sm font-medium">Appearance</span><ThemeToggle /></div><div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900"><div aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-950">{initials}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{identity}</p><p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{identityDetail}</p></div></div>{signOutError && <p className="mt-2 text-xs text-[#a01a26]" role="alert">{signOutError}</p>}{viewer.signedIn && <Button className="mt-3 w-full" disabled={signingOut} onClick={handleSignOut} size="sm" type="button" variant="outline">{signingOut ? "Signing out…" : "Sign out"}</Button>}</div></nav></div>}

      <div className={cn("min-h-screen transition-[margin] duration-200", mainOffset)}>
        {showHeader && <header className="sticky top-0 z-10 hidden border-b border-zinc-200/90 bg-white/90 px-5 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90 lg:block"><div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#D19300] dark:text-[#FFD50D]">TaskHive workspace</p><h1 className="mt-1 text-xl font-bold tracking-tight">{title}</h1><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p></div><div className="flex items-center gap-2">{viewer.signedIn && <Button asChild aria-label="Open notifications" className="h-9 w-9 px-0" size="sm" variant="outline"><Link href="/notifications"><Bell aria-hidden="true" className="h-4 w-4" /></Link></Button>}{primaryAction}</div></div></header>}
        <main className={cn("mx-auto max-w-[1440px] p-4 pb-8 sm:p-6 sm:pb-8 lg:p-8", contentClassName)}>{children}</main>
      </div>
    </div>
  );
}
