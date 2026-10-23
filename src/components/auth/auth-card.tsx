import Link from "next/link";

/** Centered card used by the account-recovery and email-verification flows. */
export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-zinc-100 px-4 py-10 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <Link
          className="text-xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50"
          href="/"
        >
          <span className="text-[#FFC800]">Task</span>Hive
        </Link>

        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{description}</p>
          <div className="mt-6">{children}</div>
        </div>

        <p className="mt-4 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <Link
            className="font-semibold text-zinc-950 underline underline-offset-4 dark:text-zinc-100"
            href="/login"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
