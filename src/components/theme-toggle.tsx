"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function isDarkTheme() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

function toggleTheme() {
  const root = document.documentElement;
  const dark = !isDarkTheme();
  const mode = dark ? "dark" : "light";
  root.dataset.themeMode = mode;
  root.classList.toggle("dark", dark);

  try {
    window.localStorage.setItem("taskhive-theme", mode);
  } catch {
    // The selection still applies for the current page session.
  }
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, isDarkTheme, getServerSnapshot);
  const label = dark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={toggleTheme}
      className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-md text-zinc-800 hover:text-[#725000] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#725000] dark:text-zinc-100 dark:hover:text-[#FFC800] dark:focus-visible:outline-[#FFC800]"
    >
      <Moon aria-hidden="true" className="size-[18px] dark:hidden" />
      <Sun aria-hidden="true" className="hidden size-[18px] dark:block" />
    </button>
  );
}
