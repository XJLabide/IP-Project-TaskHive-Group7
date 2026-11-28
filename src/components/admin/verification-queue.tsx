"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { requestData } from "@/lib/marketplace/http";

type Submission = { userId: string; name: string; submittedAt: string | null };
type QueueResponse = { items: Submission[]; pagination: { page: number; total: number; totalPages: number } };

export function VerificationQueue() {
  const [items, setItems] = useState<Submission[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void requestData<QueueResponse>(`/api/admin/verifications/pending?page=${page}`, { signal: controller.signal })
      .then((data) => {
        setItems(data.items);
        setPage(data.pagination.page);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load ID submissions.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, reloadCount]);

  async function decide(userId: string, outcome: "approved" | "denied") {
    setBusyUser(userId);
    setError("");
    try {
      await requestData(`/api/admin/verifications/${encodeURIComponent(userId)}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ outcome, reason: reasons[userId]?.trim() }),
      });
      setLoading(true);
      if (items.length === 1 && page > 1) setPage((current) => current - 1);
      else setReloadCount((current) => current + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the verification decision.");
    } finally {
      setBusyUser(null);
    }
  }

  return (
    <section aria-labelledby="verification-queue-title" className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight" id="verification-queue-title">Tasker identity checks</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Review one government ID image before allowing a Tasker to be assigned.</p>
        </div>
        <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold tabular-nums text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">{total} pending</span>
      </div>

      {error ? <p className="mt-4 text-sm text-red-700 dark:text-red-400" role="alert">{error}</p> : null}
      {loading ? <div aria-busy="true" className="mt-4 grid gap-3" role="status"><span className="sr-only">Loading ID submissions…</span><div aria-hidden="true" className="h-44 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" /></div> : items.length === 0 ? <p className="mt-4 rounded-lg bg-zinc-50 p-4 text-sm text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">No identity checks are waiting for review.</p> : (
        <div className="mt-5 grid gap-4">
          {items.map((item) => (
            <article className="grid gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.8fr)]" key={item.userId}>
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Submitted {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : "just now"}</p>
                <Image alt={`Government ID submitted by ${item.name}`} className="mt-3 h-auto max-h-[32rem] w-full rounded-lg bg-zinc-100 object-contain dark:bg-zinc-950" height={1200} loading="lazy" unoptimized width={1200} src={`/api/admin/verifications/${encodeURIComponent(item.userId)}/document`} />
              </div>
              <div className="grid content-start gap-3">
                <label className="grid gap-2 text-sm font-medium">Reason if rejecting
                  <textarea className="min-h-24 rounded-lg border border-zinc-300 bg-white p-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-[#FFC800] dark:border-zinc-700 dark:bg-zinc-950" onChange={(event) => setReasons((current) => ({ ...current, [item.userId]: event.target.value }))} placeholder="Explain what the applicant needs to correct." value={reasons[item.userId] ?? ""} />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={busyUser !== null} onClick={() => void decide(item.userId, "approved")} size="sm" type="button">{busyUser === item.userId ? "Saving…" : "Approve ID"}</Button>
                  <Button disabled={busyUser !== null || (reasons[item.userId]?.trim().length ?? 0) < 3} onClick={() => void decide(item.userId, "denied")} size="sm" type="button" variant="outline">Reject with reason</Button>
                </div>
                <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">The image is served through an Admin-only route and removed after the decision.</p>
              </div>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 ? <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800"><span className="tabular-nums text-zinc-500 dark:text-zinc-400">Page {page} of {totalPages}</span><div className="flex gap-2"><Button disabled={loading || page <= 1} onClick={() => { setLoading(true); setPage((current) => current - 1); }} size="sm" type="button" variant="outline">Previous</Button><Button disabled={loading || page >= totalPages} onClick={() => { setLoading(true); setPage((current) => current + 1); }} size="sm" type="button" variant="outline">Next</Button></div></div> : null}
    </section>
  );
}
