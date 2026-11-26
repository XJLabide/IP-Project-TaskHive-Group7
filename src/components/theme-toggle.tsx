"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

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
const nextTheme: Record<ThemeMode, ThemeMode> = { system: "light", light: "dark", dark: "system" };

export function ThemeToggle({ iconOnly = false }: { iconOnly?: boolean }) {
  const mode = useSyncExternalStore(subscribe, getThemeMode, getServerThemeMode);
  const Icon = themeIcons[mode];
  const next = nextTheme[mode];
  const label = `Color theme: ${mode}. Switch to ${next}.`;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setThemeMode(next)}
      className={`inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:border-[#D19300] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D19300] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-[#FFD50D] ${iconOnly ? "w-9 px-0" : ""}`}
    >
      <Icon aria-hidden="true" className="size-[18px]" />
      {!iconOnly ? <span className="capitalize">{mode}</span> : null}
    </button>
  );
}
