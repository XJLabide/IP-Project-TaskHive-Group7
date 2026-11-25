"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type ThemeMode = "light" | "dark" | "system";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme-mode"],
  });
  return () => observer.disconnect();
}

function getThemeMode(): ThemeMode {
  const mode = document.documentElement.dataset.themeMode;
  return mode === "light" || mode === "dark" ? mode : "system";
}

function getServerThemeMode(): ThemeMode {
  return "system";
}

function setThemeMode(mode: ThemeMode) {
  const root = document.documentElement;
  root.dataset.themeMode = mode;
  root.classList.toggle(
    "dark",
    mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches),
  );

  try {
    window.localStorage.setItem("taskhive-theme", mode);
  } catch {
    // The selection still applies for the current page session.
  }
}

const themeIcons = { light: Sun, dark: Moon, system: Monitor };

export function ThemeToggle({ iconOnly = false }: { iconOnly?: boolean }) {
  const mode = useSyncExternalStore(subscribe, getThemeMode, getServerThemeMode);
  const Icon = themeIcons[mode];

  const select = (
    <select
      aria-label="Color theme"
      value={mode}
      onChange={(event) => setThemeMode(event.target.value as ThemeMode)}
      className={cn(
        "cursor-pointer text-sm font-medium dark:[color-scheme:dark]",
        iconOnly
          ? "absolute inset-0 size-full opacity-0"
          : "h-9 shrink-0 rounded-lg border border-zinc-300 bg-white px-2 text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D19300] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100",
      )}
    >
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="system">System</option>
    </select>
  );

  if (!iconOnly) return select;

  return (
    <div className="relative grid size-9 shrink-0 place-items-center rounded-xl border border-zinc-300 bg-white text-zinc-800 hover:border-[#D19300] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-[#D19300] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
      <Icon aria-hidden="true" className="size-[18px]" />
      {select}
    </div>
  );
}
