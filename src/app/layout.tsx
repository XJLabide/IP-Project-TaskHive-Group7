import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import "./globals.css";

const themeScript = `
  (function() {
    try {
      const storedTheme = localStorage.getItem('taskhive-theme');
      const hour = new Date().getHours();
      const autoTheme = hour >= 18 || hour < 6 ? 'dark' : 'light';
      const theme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : autoTheme;
      document.documentElement.classList.toggle('dark', theme === 'dark');
    } catch (error) {
      document.documentElement.classList.remove('dark');
    }
  })();
`;

export const metadata: Metadata = {
  title: "TaskHive",
  description: "Community task marketplace for local errands.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full bg-zinc-50 text-zinc-950 transition-colors duration-200 dark:bg-zinc-950 dark:text-zinc-50">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
