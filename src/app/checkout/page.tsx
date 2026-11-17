"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
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


type PendingTask = { id: string; title: string };

function PendingTasks() {
  const [tasks, setTasks] = useState<PendingTask[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadTasks() {
      try {
        const response = await fetch("/api/payments/checkout", { signal: controller.signal });
        if (!response.ok) {
          setError(response.status === 401 ? "Sign in to see your pending payments." : "Could not load pending payments. Please try again.");
          return;
        }
        const body: unknown = await response.json();
        const data = body && typeof body === "object" && "data" in body ? body.data : null;
        if (!data || typeof data !== "object" || !("tasks" in data) || !Array.isArray(data.tasks)) throw new Error("Invalid response");
        setTasks(data.tasks.filter((task): task is PendingTask =>
          task !== null && typeof task === "object" && typeof task.id === "string" && typeof task.title === "string"));
      } catch {
        if (!controller.signal.aborted) setError("Could not load pending payments. Please try again.");
      }
    }
    void loadTasks();
    return () => controller.abort();
  }, []);

  return (
    <AppShell title="Payments" description="Tasks waiting for payment.">
      <Card className="max-w-2xl">
        <CardContent className="grid gap-4 p-6">
          <h2 className="text-lg font-semibold">Pending payments</h2>
          {error ? <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p> : null}
          {!tasks && !error ? <p className="text-sm text-zinc-500">Loading pending payments…</p> : null}
          {tasks?.length === 0 ? <p className="text-sm text-zinc-600 dark:text-zinc-400">You have no tasks waiting for payment.</p> : null}
          {tasks?.map((task) => (
            <div className="flex items-center justify-between gap-4 border-t border-zinc-200 pt-4 dark:border-zinc-800" key={task.id}>
              <span className="text-sm font-medium">{task.title}</span>
              <Button asChild size="sm"><Link href={`/checkout?taskId=${encodeURIComponent(task.id)}`}>Continue</Link></Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
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
