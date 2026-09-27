"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "taskhive-theme";

type ThemeMode = "light" | "dark" | "auto";

function getAutoTheme() {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6 ? "dark" : "light";
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const syncTheme = () => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const resolvedMode: ThemeMode = saved === "light" || saved === "dark" ? saved : "auto";
      const activeTheme = resolvedMode === "auto" ? getAutoTheme() : resolvedMode;

      document.documentElement.classList.toggle("dark", activeTheme === "dark");
      setIsDark(activeTheme === "dark");
    };

    syncTheme();
    const interval = window.setInterval(syncTheme, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  const handleToggle = () => {
    const nextTheme: ThemeMode = isDark ? "light" : "dark";
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    document.documentElement.classList.toggle("dark", isDark === false);
    setIsDark(!isDark);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      role="switch"
      aria-checked={isDark}
      aria-label="Dark mode"
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD50D] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-900 ${isDark ? "bg-[#FFC800]" : "bg-zinc-300 dark:bg-zinc-700"}`}
    >
      <span className={`grid h-5 w-5 place-items-center rounded-full bg-white text-zinc-800 shadow-sm transition-transform ${isDark ? "translate-x-6" : "translate-x-1"}`}>
        {isDark ? <Moon aria-hidden="true" className="h-3 w-3" /> : <Sun aria-hidden="true" className="h-3 w-3" />}
      </span>
    </button>
  );
}
