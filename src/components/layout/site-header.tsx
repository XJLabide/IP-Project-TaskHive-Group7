"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { TaskHiveBrand } from "@/components/layout/taskhive-brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import styles from "./site-header.module.css";

const navItems = [
  { href: "/", label: "Home", key: "home" },
  { href: "/tasks", label: "Browse tasks", key: "tasks" },
  { href: "/map", label: "View map", key: "map" },
] as const;
const logoOutline = "22,1.5 40,12 40,32 22,42.5 4,32 4,12";

/** Public site chrome shared by Home and guest-facing marketplace pages. */
export function SiteHeader({ active }: { active?: "home" | "tasks" | "map" }) {
  const headerRef = useRef<HTMLElement>(null);
  const progressRef = useRef<SVGPolygonElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const scroller = header.closest("[data-page-scroll]");
    const scrollTarget = scroller ?? window;
    const scrollArea = scroller ?? document.documentElement;
    const update = () => {
      const scrollTop = scroller?.scrollTop ?? window.scrollY;
      const scrollRange = scrollArea.scrollHeight - scrollArea.clientHeight;
      const progress = scrollRange > 0
        ? Math.min(100, Math.max(0, (scrollTop / scrollRange) * 100))
        : 0;

      progressRef.current?.setAttribute("stroke-dashoffset", String(100 - progress));
      setCompact(scrollTop > 40);
    };

    update();
    scrollTarget.addEventListener("scroll", update, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(scrollArea);
    if (header.parentElement) resize.observe(header.parentElement);

    return () => {
      scrollTarget.removeEventListener("scroll", update);
      resize.disconnect();
    };
  }, []);

  return (
    <header
      ref={headerRef}
      data-compact={compact ? "" : undefined}
      className={cn(styles.header, "sticky top-3 z-50 mx-auto my-3 w-[calc(100%-1.5rem)] text-zinc-950 sm:top-4 sm:my-4 sm:w-[calc(100%-4rem)] dark:text-zinc-50")}
    >
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-x-2 gap-y-2 rounded-xl border border-zinc-200/80 bg-white/90 px-3 py-2 shadow-sm backdrop-blur-md transition-colors sm:gap-x-4 sm:px-5 md:grid md:grid-cols-[1fr_auto_1fr] dark:border-zinc-800/80 dark:bg-zinc-950/90">
        <div className="relative justify-self-start">
          <TaskHiveBrand
            className={cn(styles.brand, "gap-2.5 whitespace-nowrap text-base md:text-lg max-[359px]:[&>span]:hidden")}
            iconClassName="size-8"
          />
          <svg aria-hidden="true" className="pointer-events-none absolute top-1/2 left-0 size-11 -translate-y-1/2 text-[#a66b0038] dark:text-[#ffc80038]" viewBox="0 0 44 44" fill="none" strokeWidth="2" strokeLinejoin="round">
            <polygon points={logoOutline} stroke="currentColor" />
            <polygon ref={progressRef} points={logoOutline} pathLength={100} stroke="#FFC800" strokeDasharray={100} strokeDashoffset={100} />
          </svg>
        </div>

        <nav aria-label="Public navigation" className="order-last flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-zinc-200/80 pt-2 text-sm font-medium md:order-none md:w-auto md:border-0 md:pt-0 lg:gap-x-6 dark:border-zinc-800/80">
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

        <div className="flex items-center gap-1.5 whitespace-nowrap sm:gap-2 md:justify-self-end">
          <ThemeToggle />
          <Button asChild size="sm" variant="outline" className="rounded-xl border-[#D19300] bg-[#FFC800]/14 px-2.5 text-[#674900] dark:border-[#D19300] dark:bg-[#FFC800]/10 dark:text-[#FFC800]">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm" className="rounded-xl px-2.5">
            <Link href="/signup">Sign up</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
