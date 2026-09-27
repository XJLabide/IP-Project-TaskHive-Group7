"use client";

import { Clock3, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "taskhive-theme";

type ThemeMode = "light" | "dark" | "auto";

function getAutoTheme() {
  const hour = new Date().getHours();
  return hour >= 18 || hour < 6 ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("auto");

  useEffect(() => {
    const syncTheme = () => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const resolvedMode: ThemeMode = saved === "light" || saved === "dark" ? saved : "auto";
      const activeTheme = resolvedMode === "auto" ? getAutoTheme() : resolvedMode;

      document.documentElement.classList.toggle("dark", activeTheme === "dark");
      setTheme(resolvedMode);
    };

    syncTheme();
    const interval = window.setInterval(syncTheme, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  const handleToggle = () => {
    const nextTheme: ThemeMode =
      theme === "light" ? "dark" : theme === "dark" ? "auto" : "light";

    if (nextTheme === "auto") {
      window.localStorage.removeItem(STORAGE_KEY);
      document.documentElement.classList.toggle("dark", getAutoTheme() === "dark");
      setTheme("auto");
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    setTheme(nextTheme);
  };

  const Icon = theme === "dark" ? Moon : theme === "auto" ? Clock3 : Sun;

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={`Current theme: ${theme}. Toggle to next theme.`}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#FFC800] bg-transparent text-zinc-900 transition-colors hover:border-[#D19300] hover:bg-[#FFD50D]/10 hover:text-[#D19300] dark:border-[#FFC800] dark:text-zinc-100 dark:hover:border-[#FFD50D] dark:hover:bg-[#FFC800]/10 dark:hover:text-[#FFD50D]"
    >
      <Icon className="h-4 w-4" />
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}