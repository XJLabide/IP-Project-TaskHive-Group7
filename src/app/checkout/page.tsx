"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, WalletCards } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-zinc-500">Loading checkout…</p>}>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId")?.trim() ?? "";
  if (!taskId) return <PendingTasks />;
  return <TaskCheckout key={taskId} taskId={taskId} paymentReturn={searchParams.get("payment")} />;
}

function TaskCheckout({ taskId, paymentReturn }: { taskId: string; paymentReturn: string | null }) {
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  async function startCheckout() {
    if (!taskId || pending) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError("");
    setCheckoutUrl(null);

    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = body && typeof body === "object" && "error" in body && typeof body.error === "string"
          ? body.error : "Checkout is currently unavailable. Please try again later.";
        setError(message);
        return;
      }

      const data = body && typeof body === "object" && "data" in body ? body.data : null;
      if (!data || typeof data !== "object" || !("checkoutUrl" in data) || typeof data.checkoutUrl !== "string" || !("provider" in data)) {
        throw new Error("Invalid checkout response");
      }
      const url = new URL(data.checkoutUrl);
      const expectedHost = data.provider === "stripe" ? "checkout.stripe.com"
        : data.provider === "paymongo" ? "checkout.paymongo.com"
        : data.provider === "maya" ? ["payments-web-sandbox.paymaya.com", "payments-web-sandbox.maya.ph"] : null;
      if (url.protocol !== "https:" || !expectedHost || !(Array.isArray(expectedHost) ? expectedHost.includes(url.hostname) : url.hostname === expectedHost) || url.username || url.password || url.port) {
        throw new Error("Invalid checkout URL");
      }
      setCheckoutUrl(url.toString());
    } catch {
      if (!controller.signal.aborted) setError("Checkout is currently unavailable. Please try again later.");
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  }

  return (
    <AppShell title="Checkout" description="Continue to your payment provider to pay for this task.">
      <div className="mx-auto grid max-w-2xl gap-6">
        <Link className="flex w-fit items-center gap-2 text-sm text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100" href="/checkout">
          <ArrowLeft className="h-4 w-4" /> Back to payments
        </Link>
        <Card>
          <CardContent className="grid gap-4 p-6">
            <div>
              <h2 className="text-lg font-semibold">Pay with your payment provider</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                Payment details are entered on the provider’s checkout page. Your assignment activates after payment is confirmed.
              </p>
            </div>
            {paymentReturn === "cancelled" ? <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">Checkout was cancelled. No payment was confirmed.</p> : null}
            {paymentReturn === "success" ? <PaymentStatus taskId={taskId} /> : null}
            {error ? <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p> : null}
            {paymentReturn === "success" ? (
              <Button asChild className="w-fit" variant="outline"><Link href="/checkout">View pending payments</Link></Button>
            ) : checkoutUrl ? (
              <Button asChild className="w-fit">
                <a href={checkoutUrl}>Open payment provider <ExternalLink className="h-4 w-4" /></a>
              </Button>
            ) : (
              <Button className="w-fit" disabled={!taskId || pending} onClick={() => void startCheckout()} type="button">
                {pending ? "Preparing checkout…" : "Continue to payment"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}


type PendingTask = { id: string; title: string; amountCents: number | null; currency: string };
type PaymentHistoryItem = {
  id: string;
  taskId: string;
  taskTitle: string;
  taskStatus: string;
  role: "poster" | "tasker";
  provider: string;
  currency: string;
  amountCents: number;
  platformFeeCents: number;
  refundedCents: number;
  status: "pending" | "not_completed" | "held" | "released" | "refunded" | "under_review";
  transactionAt: string;
  payoutReleasedAt: string | null;
};
type HistoryRoleFilter = "all" | "poster" | "tasker";
type HistoryPeriod = "all" | "30" | "90" | "year";

const selectClass = "h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none focus-visible:ring-2 focus-visible:ring-[#FFD50D] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

function PendingTasks() {
  const [tasks, setTasks] = useState<PendingTask[] | null>(null);
  const [history, setHistory] = useState<PaymentHistoryItem[]>([]);
  const [historyNextCursor, setHistoryNextCursor] = useState<string | null>(null);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const [error, setError] = useState("");
  const [roleFilter, setRoleFilter] = useState<HistoryRoleFilter>("all");
  const [period, setPeriod] = useState<HistoryPeriod>("all");
  const [newestFirst, setNewestFirst] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [now, setNow] = useState(0);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadTasks() {
      try {
        const response = await fetch("/api/payments/checkout", { signal: controller.signal });
        if (!response.ok) {
          setError(response.status === 401 ? "Sign in to see your payments." : "Could not load payments. Please try again.");
          return;
        }
        const body: unknown = await response.json();
        const data = body && typeof body === "object" && "data" in body ? body.data : null;
        if (!data || typeof data !== "object" || !("tasks" in data) || !Array.isArray(data.tasks) || !("history" in data) || !Array.isArray(data.history)) throw new Error("Invalid response");
        setTasks(data.tasks.filter((task): task is PendingTask =>
          task !== null && typeof task === "object" && typeof task.id === "string" && typeof task.title === "string" && (typeof task.amountCents === "number" || task.amountCents === null) && typeof task.currency === "string"));
        setHistory(data.history.filter((item): item is PaymentHistoryItem =>
          item !== null && typeof item === "object" && typeof item.id === "string" && typeof item.taskTitle === "string"));
        setHistoryNextCursor("historyNextCursor" in data && typeof data.historyNextCursor === "string" ? data.historyNextCursor : null);
      } catch {
        if (!controller.signal.aborted) setError("Could not load payments. Please try again.");
      }
    }
    void loadTasks();
    return () => controller.abort();
  }, [reloadCount]);

  const filteredHistory = history
    .filter((item) => roleFilter === "all" || item.role === roleFilter)
    .filter((item) => {
      if (period === "all") return true;
      const date = new Date(item.transactionAt).getTime();
      const days = period === "year" ? 365 : Number(period);
      return date >= now - days * 24 * 60 * 60 * 1000;
    })
    .sort((a, b) => newestFirst
      ? new Date(b.transactionAt).getTime() - new Date(a.transactionAt).getTime()
      : new Date(a.transactionAt).getTime() - new Date(b.transactionAt).getTime());
  const visibleHistory = showAll ? filteredHistory : filteredHistory.slice(0, 5);

  async function loadMoreHistory() {
    if (!historyNextCursor || loadingMoreHistory) return;
    setLoadingMoreHistory(true);
    try {
      const response = await fetch(`/api/payments/checkout?historyCursor=${encodeURIComponent(historyNextCursor)}`);
      if (!response.ok) throw new Error("Could not load older payments.");
      const body: unknown = await response.json();
      const data = body && typeof body === "object" && "data" in body ? body.data : null;
      if (!data || typeof data !== "object" || !("history" in data) || !Array.isArray(data.history)) throw new Error("Invalid response");
      const next = data.history.filter((item): item is PaymentHistoryItem => item !== null && typeof item === "object" && typeof item.id === "string" && typeof item.taskTitle === "string");
      setHistory((current) => [...current, ...next]);
      setHistoryNextCursor("historyNextCursor" in data && typeof data.historyNextCursor === "string" ? data.historyNextCursor : null);
      setShowAll(true);
    } catch {
      setError("Could not load older payment history. Please try again.");
    } finally {
      setLoadingMoreHistory(false);
    }
  }

  function toggleHistory() {
    if (showAll) {
      setShowAll(false);
      return;
    }
    setShowAll(true);
    if (historyNextCursor) void loadMoreHistory();
  }

  return (
    <AppShell showHeader={false} title="Payments" description="Track incoming and past payments for your tasks.">
      <div className="grid w-full gap-6">
        <header className="grid gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">Your payments</h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400">Track incoming and past payments for your tasks.</p>
        </header>
        <section className="relative isolate overflow-hidden rounded-2xl border border-[#F3DEA0] bg-[#FFF9E8] px-5 py-5 dark:border-[#594916] dark:bg-[#211D10] sm:px-7 sm:py-6">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-28 -z-10 h-64 w-64 rounded-full border-[32px] border-[#FFE99E]/60 dark:border-[#6A5419]/30" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-36 -z-10 h-72 w-72 rounded-full border-[24px] border-[#FFF0BE]/70 dark:border-[#776020]/20" />
          <div className="relative flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[#FFEDB0] text-zinc-900 dark:bg-[#514319] dark:text-[#FFE99E]">
              <WalletCards aria-hidden="true" className="h-7 w-7" strokeWidth={1.8} />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">Manage your task payments</h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">See what’s pending, review payment history, and track payout status.</p>
            </div>
          </div>
        </section>

        <div className="grid w-full items-stretch gap-5 xl:grid-cols-[minmax(20rem,0.9fr)_minmax(0,1.7fr)]">
          <Card className="xl:min-h-[320px]">
            <CardContent className="grid h-full content-start gap-4 p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Pending payments</h2>
              {error ? <div className="grid gap-2"><p role="alert" className="text-sm text-red-700 dark:text-red-400">We couldn’t load your payments. Check your connection and try again.</p><Button className="w-fit" onClick={() => { setError(""); setTasks(null); setReloadCount((count) => count + 1); }} size="sm" type="button" variant="outline">Try again</Button></div> : null}
              {!tasks && !error ? <p className="text-sm text-zinc-500">Loading pending payments…</p> : null}
              {tasks?.length === 0 ? (
                <div className="grid min-h-56 content-center justify-items-center gap-3 px-2 text-center">
                  <span className="grid h-16 w-16 place-items-center rounded-xl bg-[#FFF4CF] text-zinc-900 dark:bg-[#403716] dark:text-[#FFE99E]">
                    <WalletCards aria-hidden="true" className="h-8 w-8" strokeWidth={1.7} />
                  </span>
                  <h3 className="text-base font-semibold">You’re all caught up</h3>
                  <p className="max-w-xs text-sm leading-6 text-zinc-600 dark:text-zinc-400">Payments that need your action will appear here. Completed payments and payouts stay in your history.</p>
                  <Button asChild size="sm" variant="outline"><Link href="/my-work">View your work</Link></Button>
                </div>
              ) : null}
              {tasks?.map((task) => (
                <div className="flex items-center justify-between gap-4 py-2" key={task.id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="mt-1 text-sm tabular-nums text-zinc-500 dark:text-zinc-400">{task.amountCents === null ? "Accepted bid unavailable" : formatPaymentAmount(task.amountCents, task.currency)}</p>
                  </div>
                  <Button asChild size="sm"><Link href={`/checkout?taskId=${encodeURIComponent(task.id)}`}>Continue</Link></Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="xl:min-h-[320px]">
            <CardContent className="grid content-start gap-4 p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Payment history</h2>
                {filteredHistory.length > 5 || historyNextCursor ? <button className="text-sm font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white" disabled={loadingMoreHistory} onClick={toggleHistory} type="button">{loadingMoreHistory ? "Loading…" : historyNextCursor ? (showAll ? "Load older" : "View all") : showAll ? "Show less" : "View all"} <span aria-hidden="true">→</span></button> : null}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <label className="sr-only" htmlFor="payment-role-filter">Payment type</label>
                  <select className={selectClass} id="payment-role-filter" onChange={(event) => setRoleFilter(event.target.value as HistoryRoleFilter)} value={roleFilter}>
                    <option value="all">All payments</option><option value="poster">Payments made</option><option value="tasker">Payouts earned</option>
                  </select>
                  <label className="sr-only" htmlFor="payment-period-filter">Date range</label>
                  <select className={selectClass} id="payment-period-filter" onChange={(event) => { setPeriod(event.target.value as HistoryPeriod); setNow(Date.now()); }} value={period}>
                    <option value="all">All time</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="year">Last 12 months</option>
                  </select>
                </div>
                <label className="sr-only" htmlFor="payment-sort">Sort payment history</label>
                <select className={selectClass} id="payment-sort" onChange={(event) => setNewestFirst(event.target.value === "newest")} value={newestFirst ? "newest" : "oldest"}>
                  <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
                </select>
              </div>
              {error ? <p role="alert" className="text-sm text-red-700 dark:text-red-400">Payment history is unavailable. Please try again.</p> : null}
              {!tasks && !error ? <p className="text-sm text-zinc-500">Loading payment history…</p> : null}
              {tasks && filteredHistory.length === 0 ? <p className="py-8 text-sm text-zinc-600 dark:text-zinc-400">{history.length ? "No payments match these filters." : historyNextCursor ? "No matches on this page. Check older payment history." : "Your payment and payout history will appear here."}</p> : null}
              {visibleHistory.map((item) => (
                <article className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" key={item.id}>
                  <div className="grid gap-1">
                    <h3 className="font-semibold">{item.taskTitle}</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">{item.role === "poster" ? "Poster" : "Tasker"} · {item.provider === "maya" ? "Maya" : item.provider}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{new Date(item.transactionAt).toLocaleString()}</p>
                    {item.role === "poster" && item.status === "held" ? <p className="text-xs text-zinc-500 dark:text-zinc-400">{taskStatusLabel(item.taskStatus)}</p> : null}
                    {item.role === "tasker" && item.status === "held" ? <p className="text-xs text-zinc-500 dark:text-zinc-400">The payment is held until task completion.</p> : null}
                    {item.role === "tasker" && item.status === "released" ? <p className="text-xs text-zinc-500 dark:text-zinc-400">TaskHive recorded the payout release.</p> : null}
                    {item.role === "poster" && item.refundedCents > 0 ? <p className="text-xs text-zinc-500 dark:text-zinc-400">Refunded {formatPaymentAmount(item.refundedCents, item.currency)}</p> : null}
                  </div>
                  <div className="grid justify-items-start gap-2 sm:justify-items-end">
                    <p className="text-base font-semibold tabular-nums">{paymentAmountLabel(item)} {formatPaymentAmount(item.amountCents, item.currency)}</p>
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${historyStatusClass(item.status)}`}>{historyStatusLabel(item.status, item.role)}</span>
                  </div>
                </article>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function historyStatusClass(status: PaymentHistoryItem["status"]) {
  if (status === "released") return "border-[#75D333]/40 bg-[#75D333]/15 text-[#2f6b12] dark:text-[#75D333]";
  if (status === "held" || status === "pending") return "border-[#FFC800]/40 bg-[#FFD50D]/20 text-zinc-700 dark:bg-[#FFC800]/15 dark:text-zinc-200";
  if (status === "not_completed" || status === "under_review") return "border-[#F04452]/30 bg-[#F04452]/10 text-[#a01a26] dark:text-[#F04452]";
  return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";
}

function formatPaymentAmount(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(cents / 100);
}

function paymentAmountLabel(item: PaymentHistoryItem) {
  if (item.status === "not_completed") return item.role === "poster" ? "Attempted" : "Expected";
  if (item.status === "pending") return item.role === "poster" ? "Pending" : "Expected";
  if (item.status === "held") return item.role === "poster" ? "Paid" : "Payout";
  if (item.status === "released") return item.role === "poster" ? "Paid" : "Payout released";
  if (item.status === "refunded") return "Refunded";
  return item.role === "poster" ? "Under review" : "Payout under review";
}

function historyStatusLabel(status: PaymentHistoryItem["status"], role: PaymentHistoryItem["role"]) {
  if (status === "held") return role === "tasker" ? "Payout held" : "Paid";
  if (status === "released") return role === "tasker" ? "Payout released" : "Paid";
  if (status === "not_completed") return "Not completed";
  if (status === "under_review") return "Under review";
  if (status === "refunded") return "Refunded";
  return "Pending";
}

function taskStatusLabel(status: string) {
  if (status === "ASSIGNED" || status === "IN_PROGRESS") return "Task in progress";
  if (status === "AWAITING_CONFIRMATION") return "Awaiting confirmation";
  if (status === "COMPLETED") return "Task complete";
  if (status === "DISPUTED") return "Disputed";
  if (status === "CANCELLATION_REVIEW") return "Cancellation under review";
  return "Assignment pending";
}


type PaymentState = "pending" | "confirmed" | "refunded" | "needs_attention" | "unpaid" | "error";

function PaymentStatus({ taskId }: { taskId: string }) {
  const [status, setStatus] = useState<PaymentState>("pending");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function checkStatus() {
      try {
        const response = await fetch(`/api/payments/checkout?taskId=${encodeURIComponent(taskId)}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Status unavailable");
        const body: unknown = await response.json();
        const data = body && typeof body === "object" && "data" in body ? body.data : null;
        const value = data && typeof data === "object" && "status" in data ? data.status : null;
        if (value !== "pending" && value !== "confirmed" && value !== "refunded" && value !== "needs_attention" && value !== "unpaid") throw new Error("Invalid status");
        if (!controller.signal.aborted) setStatus(value);
      } catch {
        if (!controller.signal.aborted) setStatus("error");
      }
    }
    void checkStatus();
    return () => controller.abort();
  }, [taskId, refresh]);

  const message = status === "confirmed" ? "Payment confirmed."
    : status === "refunded" ? "This payment was refunded."
    : status === "unpaid" ? "Payment was not completed. You can try again from pending payments."
    : status === "needs_attention" ? "This payment or assignment needs review. Contact support."
    : status === "error" ? "Could not check payment status. Please try again."
    : "Waiting for payment confirmation from the provider.";

  return (
    <div className="grid gap-3">
      <p role="status" className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
      {status === "pending" || status === "error" ? <Button className="w-fit" onClick={() => setRefresh((value) => value + 1)} size="sm" type="button" variant="outline">Check payment status</Button> : null}
    </div>
  );
}
