"use client";

import { Suspense, useEffect, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Lock,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Wallet,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useViewer } from "@/components/viewer/viewer-provider";
import { useMarketplace } from "@/lib/mock-marketplace-store";
import { useMockTasks } from "@/lib/mock-task-store";
import { formatRemaining, remainingMs } from "@/lib/payments/demo";

const inputClass =
  "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none placeholder:text-zinc-400 focus:border-[#D19300] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-[#FFD50D]";

function money(cents: number): string {
  return `PHP ${(cents / 100).toFixed(2)}`;
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center p-8 text-sm text-zinc-500">
          Loading checkout…
        </main>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId") ?? "";
  const initialGateway = searchParams.get("gateway") ?? "paymongo";

  const { tasks } = useMockTasks();
  const { assignmentForTask, pay } = useMarketplace();

  const [selectedGateway, setSelectedGateway] = useState<"paymongo" | "stripe">(
    initialGateway === "stripe" ? "stripe" : "paymongo",
  );
  const [payMethod, setPayMethod] = useState<"gcash" | "maya" | "card">("gcash");

  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("123");
  const [phone, setPhone] = useState("0917 555 0199");

  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Webhook live testing
  const [webhookStatus, setWebhookStatus] = useState<string | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(false);

  // Find task or fallback to demo
  const task = tasks.find((t) => t.id === taskId);
  const assignment = taskId ? assignmentForTask(taskId) : null;

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const amountCents = assignment?.amountCents ?? (task ? Math.round(task.budget * 100) : 150000);
  const feeCents = assignment?.platformFeeCents ?? Math.round(amountCents * 0.05);
  const payoutCents = assignment?.payoutCents ?? amountCents - feeCents;

  const remainingTime = assignment ? formatRemaining(remainingMs(assignment, now)) : "23h 59m";

  async function handleCompletePayment(outcome: "success" | "failure") {
    setProcessing(true);
    setStatusMessage(null);

    await new Promise((res) => setTimeout(res, 800));

    if (outcome === "success") {
      if (taskId) {
        pay(taskId, "success");
      }
      setStatusMessage({
        type: "success",
        text: `Payment of ${money(amountCents)} confirmed via ${selectedGateway.toUpperCase()}. Assignment is now ACTIVE.`,
      });
      setProcessing(false);

      if (taskId) {
        setTimeout(() => {
          router.push(`/tasks/${taskId}?payment=success`);
        }, 1200);
      }
    } else {
      if (taskId) {
        pay(taskId, "failure");
      }
      setStatusMessage({
        type: "error",
        text: `Payment attempt was declined by ${selectedGateway.toUpperCase()}. The hold remains open for retries.`,
      });
      setProcessing(false);
    }
  }

  async function testWebhookApi(type: "succeeded" | "failed" | "refunded") {
    setWebhookLoading(true);
    setWebhookStatus(null);
    try {
      const response = await fetch("/api/payments/webhook", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          id: `test_evt_${Date.now()}`,
          type,
          reference: assignment?.id ? `fake_cs_${assignment.id}` : "fake_cs_test_123",
          amountCents,
        }),
      });

      const data = await response.json().catch(() => ({}));
      setWebhookStatus(
        `HTTP ${response.status} ${response.statusText} — Response: ${JSON.stringify(data)}`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "network error";
      setWebhookStatus(`Webhook call failed: ${msg}`);
    } finally {
      setWebhookLoading(false);
    }
  }

  return (
    <AppShell
      title="Secure Checkout"
      description="Complete payment to reserve and activate your chosen Tasker."
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            href={taskId ? `/tasks/${taskId}` : "/tasks"}
          >
            <ArrowLeft className="h-4 w-4" /> Back to {taskId ? "task" : "tasks"}
          </Link>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Lock className="h-3.5 w-3.5 text-[#2f6b12] dark:text-[#75D333]" />
            <span>256-bit encrypted gateway integration</span>
          </div>
        </div>

        {statusMessage ? (
          <div
            className={`mb-6 flex items-start gap-3 rounded-xl border p-4 text-sm ${
              statusMessage.type === "success"
                ? "border-[#75D333]/40 bg-[#75D333]/10 text-[#2f6b12] dark:text-[#75D333]"
                : "border-[#F04452]/40 bg-[#F04452]/10 text-[#a01a26] dark:text-[#F04452]"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
            )}
            <div>
              <p className="font-semibold">{statusMessage.text}</p>
              {statusMessage.type === "success" && taskId ? (
                <p className="mt-1 text-xs opacity-90">Redirecting to task details…</p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* Main Checkout Form */}
          <div className="grid gap-6">
            {/* Gateway Selector */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">1. Select Payment Gateway</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all ${
                      selectedGateway === "paymongo"
                        ? "border-[#FFC800] bg-[#FFD50D]/10 ring-2 ring-[#FFC800] dark:bg-[#FFC800]/15"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800"
                    }`}
                    onClick={() => {
                      setSelectedGateway("paymongo");
                      setPayMethod("gcash");
                    }}
                    type="button"
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-bold text-zinc-950 dark:text-zinc-50">PayMongo</span>
                      <Badge className="bg-[#FFD50D]/20 text-[#855B00] dark:text-[#FFD50D]">
                        Philippines
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      GCash, Maya, Cards, Online Banking
                    </p>
                  </button>

                  <button
                    className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all ${
                      selectedGateway === "stripe"
                        ? "border-[#FFC800] bg-[#FFD50D]/10 ring-2 ring-[#FFC800] dark:bg-[#FFC800]/15"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800"
                    }`}
                    onClick={() => {
                      setSelectedGateway("stripe");
                      setPayMethod("card");
                    }}
                    type="button"
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-bold text-zinc-950 dark:text-zinc-50">Stripe</span>
                      <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        Global
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Credit / Debit Cards, Apple Pay
                    </p>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">2. Payment Method</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                {selectedGateway === "paymongo" ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        className="gap-2"
                        onClick={() => setPayMethod("gcash")}
                        size="sm"
                        type="button"
                        variant={payMethod === "gcash" ? "default" : "outline"}
                      >
                        <Smartphone className="h-4 w-4" /> GCash
                      </Button>
                      <Button
                        className="gap-2"
                        onClick={() => setPayMethod("maya")}
                        size="sm"
                        type="button"
                        variant={payMethod === "maya" ? "default" : "outline"}
                      >
                        <Wallet className="h-4 w-4" /> Maya
                      </Button>
                      <Button
                        className="gap-2"
                        onClick={() => setPayMethod("card")}
                        size="sm"
                        type="button"
                        variant={payMethod === "card" ? "default" : "outline"}
                      >
                        <CreditCard className="h-4 w-4" /> Card
                      </Button>
                    </div>

                    {payMethod === "gcash" || payMethod === "maya" ? (
                      <div className="grid gap-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                        <label className="text-sm font-semibold" htmlFor="mobile-number">
                          {payMethod === "gcash" ? "GCash" : "Maya"} Registered Mobile Number
                        </label>
                        <input
                          className={inputClass}
                          id="mobile-number"
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                          placeholder="0917 123 4567"
                          value={phone}
                        />
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          In live mode, PayMongo routes to the {payMethod.toUpperCase()} OTP
                          confirmation portal.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                        <div>
                          <label className="text-sm font-semibold" htmlFor="card-num">
                            Card Number
                          </label>
                          <input
                            className={inputClass}
                            id="card-num"
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setCardNumber(e.target.value)}
                            value={cardNumber}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-semibold" htmlFor="card-exp">
                              Expiry
                            </label>
                            <input
                              className={inputClass}
                              id="card-exp"
                              onChange={(e: ChangeEvent<HTMLInputElement>) => setCardExpiry(e.target.value)}
                              value={cardExpiry}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-semibold" htmlFor="card-cvc">
                              CVC
                            </label>
                            <input
                              className={inputClass}
                              id="card-cvc"
                              onChange={(e: ChangeEvent<HTMLInputElement>) => setCardCvc(e.target.value)}
                              value={cardCvc}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="grid gap-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <div>
                      <label className="text-sm font-semibold" htmlFor="stripe-card-num">
                        Card Number
                      </label>
                      <input
                        className={inputClass}
                        id="stripe-card-num"
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setCardNumber(e.target.value)}
                        value={cardNumber}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-semibold" htmlFor="stripe-card-exp">
                          Expiry (MM/YY)
                        </label>
                        <input
                          className={inputClass}
                          id="stripe-card-exp"
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setCardExpiry(e.target.value)}
                          value={cardExpiry}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold" htmlFor="stripe-card-cvc">
                          CVC
                        </label>
                        <input
                          className={inputClass}
                          id="stripe-card-cvc"
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setCardCvc(e.target.value)}
                          value={cardCvc}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Standard Stripe test card <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">4242 4242...</code> pre-filled.
                    </p>
                  </div>
                )}

                {/* Primary Payment Actions */}
                <div className="mt-2 flex flex-col gap-3">
                  <Button
                    className="w-full gap-2 text-base font-semibold"
                    disabled={processing}
                    onClick={() => handleCompletePayment("success")}
                    size="lg"
                    type="button"
                  >
                    {processing ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                    Authorize & Pay {money(amountCents)} ({selectedGateway.toUpperCase()})
                  </Button>

                  <Button
                    className="w-full"
                    disabled={processing}
                    onClick={() => handleCompletePayment("failure")}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Simulate Payment Failure / Card Decline
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Live API Webhook Testing Tool */}
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Developer Webhook Verification Tool
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-xs">
                <p className="text-zinc-500 dark:text-zinc-400">
                  Test the actual HTTP <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">POST /api/payments/webhook</code> endpoint directly from this browser session:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={webhookLoading}
                    onClick={() => testWebhookApi("succeeded")}
                    size="sm"
                    type="button"
                  >
                    <Send className="mr-1 h-3.5 w-3.5" /> Test Webhook: succeeded
                  </Button>
                  <Button
                    disabled={webhookLoading}
                    onClick={() => testWebhookApi("failed")}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Test Webhook: failed
                  </Button>
                  <Button
                    disabled={webhookLoading}
                    onClick={() => testWebhookApi("refunded")}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Test Webhook: refunded
                  </Button>
                </div>
                {webhookStatus ? (
                  <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-3 font-mono text-[11px] text-zinc-200">
                    {webhookStatus}
                  </pre>
                ) : null}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary Sidebar */}
          <div className="grid content-start gap-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base font-bold">
                  <span>Order Summary</span>
                  <Badge className="border-[#FFC800]/40 bg-[#FFD50D]/20 text-zinc-700 dark:text-zinc-200">
                    Hold: {remainingTime}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div>
                  <h3 className="font-semibold text-zinc-950 dark:text-zinc-50">
                    {task?.title ?? "Condo Deep Cleaning & Organization"}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Tasker:{" "}
                    <span className="font-medium text-zinc-900 dark:text-zinc-200">
                      {assignment?.tasker ?? "Maria Santos"}
                    </span>
                  </p>
                </div>

                <dl className="grid gap-2 border-y border-zinc-100 py-3 text-sm dark:border-zinc-800">
                  <div className="flex justify-between">
                    <dt className="text-zinc-500 dark:text-zinc-400">Task Price</dt>
                    <dd className="font-semibold">{money(amountCents)}</dd>
                  </div>
                  <div className="flex justify-between text-xs">
                    <dt className="text-zinc-500 dark:text-zinc-400">
                      Platform Fee (5%, deducted from Tasker)
                    </dt>
                    <dd className="text-zinc-600 dark:text-zinc-300">
                      {money(feeCents)}
                    </dd>
                  </div>
                  <div className="flex justify-between border-t border-zinc-100 pt-2 text-xs font-medium dark:border-zinc-800">
                    <dt className="text-zinc-500 dark:text-zinc-400">Tasker Net Payout</dt>
                    <dd>{money(payoutCents)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-zinc-100 pt-2 text-base font-bold dark:border-zinc-800">
                    <dt>Total Due Now</dt>
                    <dd className="text-[#2f6b12] dark:text-[#75D333]">{money(amountCents)}</dd>
                  </div>
                </dl>

                <div className="rounded-xl bg-zinc-50 p-3 text-xs leading-5 text-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-zinc-200">
                    <ShieldCheck className="h-4 w-4 text-[#2f6b12] dark:text-[#75D333]" />
                    <span>Provider-Managed Protection</span>
                  </div>
                  <p className="mt-1">
                    Your payment is held safely until the task is complete. Exact address is unlocked
                    immediately after payment. Not legal escrow.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
