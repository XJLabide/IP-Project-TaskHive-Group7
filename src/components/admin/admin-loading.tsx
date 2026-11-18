export function AdminLoading() {
  return (
    <div aria-busy="true" className="grid gap-6" role="status">
      <span className="sr-only">Loading Admin workspace…</span>
      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="h-3 w-36 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-4 h-8 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
      </section>
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900" key={item}>
            <div className="h-7 w-12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-3 h-3 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          </div>
        ))}
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {[0, 1].map((column) => (
          <div className="grid content-start gap-6" key={column}>
            {[0, 1, 2].map((section) => (
              <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900" key={section}>
                <div className="h-5 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-4 grid gap-3">
                  {[0, 1].map((row) => <div className="h-20 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800/70" key={row} />)}
                </div>
              </section>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
