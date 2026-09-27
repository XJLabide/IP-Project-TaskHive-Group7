"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "taskhive-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check local storage, default to light if nothing is found
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const currentTheme = saved === "dark" ? "dark" : "light";
    
    setTheme(currentTheme);
    document.documentElement.classList.toggle("dark", currentTheme === "dark");
  }, []);

  const handleToggle = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    setTheme(nextTheme);
  };

  // Prevent hydration mismatch by rendering a blank placeholder of the same size until mounted
  if (!mounted) {
    return <div className="h-9 w-9 rounded-md border border-transparent" />;
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label="Toggle theme"
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#FFC800] bg-transparent text-zinc-900 transition-colors hover:border-[#D19300] hover:bg-[#FFD50D]/10 hover:text-[#D19300] dark:border-[#FFC800] dark:text-zinc-100 dark:hover:border-[#FFD50D] dark:hover:bg-[#FFC800]/10 dark:hover:text-[#FFD50D]"
    >
      {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}