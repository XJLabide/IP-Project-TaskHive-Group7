import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import { ViewerProvider } from "@/components/viewer/viewer-provider";
import { loadCurrentActor } from "@/lib/auth/current-actor";
import { viewerSnapshot } from "@/lib/viewer/presentation";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const themeScript = `
  (function() {
    const root = document.documentElement;
    const system = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const mode = root.dataset.themeMode;
      root.classList.toggle('dark', mode === 'dark' || (mode === 'system' && system.matches));
    };
    const syncPreference = () => {
      let storedTheme;
      try {
        storedTheme = localStorage.getItem('taskhive-theme');
      } catch {}
      root.dataset.themeMode = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'system';
      applyTheme();
    };
    syncPreference();
    system.addEventListener('change', applyTheme);
    window.addEventListener('storage', (event) => {
      if (event.key === 'taskhive-theme' || event.key === null) syncPreference();
    });
  })();
`;

export const metadata: Metadata = {
  title: "TaskHive",
  description: "Community task marketplace for local errands.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const actor = await loadCurrentActor();

  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full bg-zinc-50 text-zinc-950 transition-colors duration-200 dark:bg-zinc-950 dark:text-zinc-50">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <ViewerProvider initialViewer={viewerSnapshot(actor)}>{children}</ViewerProvider>
      </body>
    </html>
  );
}
