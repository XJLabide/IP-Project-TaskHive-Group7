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
  const [mounted, setMounted] = useState(false);
  const taskId = searchParams.get("taskId") ?? "";
  const initialGateway = searchParams.get("gateway") ?? "paymongo";

  const { tasks, setStatus } = useMockTasks();
  const { assignmentForTask, pay } = useMarketplace();

  const [selectedGateway, setSelectedGateway] = useState<"paymongo" | "stripe">(
    initialGateway === "stripe" ? "stripe" : "paymongo",
  );
  const [payMethod, setPayMethod] = useState<"gcash" | "maya" | "card">("gcash");

  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [phone, setPhone] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Find task or fallback
  const task = tasks.find((t) => t.id === taskId);
  const assignment = taskId ? assignmentForTask(taskId) : null;

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const amountCents = assignment?.amountCents ?? (task ? Math.round(task.budget * 100) : 150000);
  const feeCents = assignment?.platformFeeCents ?? Math.round(amountCents * 0.05);
  const payoutCents = assignment?.payoutCents ?? amountCents - feeCents;

  const remainingTime = assignment ? formatRemaining(remainingMs(assignment, now)) : "23h 59m";

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (selectedGateway === "paymongo" && (payMethod === "gcash" || payMethod === "maya")) {
      const cleanPhone = phone.replace(/\D/g, "");
      if (!phone.trim()) {
        errors.phone = `Please enter your ${payMethod === "gcash" ? "GCash" : "Maya"} mobile number.`;
      } else if (!cleanPhone.startsWith("09") || cleanPhone.length !== 11) {
        errors.phone = "Enter a valid 11-digit mobile number starting with 09 (e.g., 0917 123 4567).";
      }
    } else {
      const cleanCard = cardNumber.replace(/\D/g, "");
      if (!cardNumber.trim()) {
        errors.cardNumber = "Card number is required.";
      } else if (cleanCard.length < 15 || cleanCard.length > 16) {
        errors.cardNumber = "Card number must be 15 or 16 digits.";
      }

      const expiryParts = cardExpiry.split("/");
      if (!cardExpiry.trim()) {
        errors.cardExpiry = "Expiry is required.";
      } else if (expiryParts.length !== 2) {
        errors.cardExpiry = "Format must be MM/YY.";
      } else {
        const month = parseInt(expiryParts[0].trim(), 10);
        const year = parseInt(expiryParts[1].trim(), 10);
        if (isNaN(month) || month < 1 || month > 12) {
          errors.cardExpiry = "Month must be between 01 and 12.";
        } else if (isNaN(year) || year < 24) {
          errors.cardExpiry = "Card has already expired.";
        }
      }

      const cleanCvc = cardCvc.replace(/\D/g, "");
      if (!cardCvc.trim()) {
        errors.cardCvc = "CVC is required.";
      } else if (cleanCvc.length < 3 || cleanCvc.length > 4) {
        errors.cardCvc = "CVC must be 3 or 4 digits.";
      }
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setStatusMessage({
        type: "error",
        text: "Please provide all required payment details correctly before proceeding.",
      });
      return false;
    }

    return true;
  }

  async function handleCompletePayment() {
    setStatusMessage(null);

    if (!validate()) {
      return;
    }

    setProcessing(true);

    await new Promise((res) => setTimeout(res, 800));

    if (taskId) {
      pay(taskId, "success");
      setStatus(taskId, "assigned");
    }
    setStatusMessage({
      type: "success",
      text: `Payment of ${money(amountCents)} confirmed via ${selectedGateway.toUpperCase()}. Assignment is now ACTIVE.`,
    });
    setProcessing(false);

    if (taskId) {
      setTimeout(() => {
        router.push(`/tasks/${taskId}?payment=success`);
      }, 1000);
    }
  }

  if (!mounted) {
    return (
      <AppShell
        title="Secure Checkout"
        description="Complete payment to reserve and activate your chosen Tasker."
      >
        <div className="mx-auto max-w-5xl py-24 text-center text-sm text-zinc-500">
          Loading checkout…
        </div>
      </AppShell>
    );
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
                          className={`${inputClass} ${fieldErrors.phone ? "border-[#F04452] focus:border-[#F04452]" : ""}`}
                          id="mobile-number"
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            setPhone(e.target.value);
                            if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: "" }));
                          }}
                          placeholder="0917 123 4567"
                          value={phone}
                        />
                        {fieldErrors.phone ? (
                          <p className="text-xs font-medium text-[#F04452]">{fieldErrors.phone}</p>
                        ) : null}
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Payment will be authenticated and processed securely via {payMethod.toUpperCase()}.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                        <div>
                          <label className="text-sm font-semibold" htmlFor="card-num">
                            Card Number
                          </label>
                          <input
                            className={`${inputClass} ${fieldErrors.cardNumber ? "border-[#F04452] focus:border-[#F04452]" : ""}`}
                            id="card-num"
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                              setCardNumber(e.target.value);
                              if (fieldErrors.cardNumber) setFieldErrors((prev) => ({ ...prev, cardNumber: "" }));
                            }}
                            placeholder="4242 4242 4242 4242"
                            value={cardNumber}
                          />
                          {fieldErrors.cardNumber ? (
                            <p className="mt-1 text-xs font-medium text-[#F04452]">{fieldErrors.cardNumber}</p>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-semibold" htmlFor="card-exp">
                              Expiry
                            </label>
                            <input
                              className={`${inputClass} ${fieldErrors.cardExpiry ? "border-[#F04452] focus:border-[#F04452]" : ""}`}
                              id="card-exp"
                              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                setCardExpiry(e.target.value);
                                if (fieldErrors.cardExpiry) setFieldErrors((prev) => ({ ...prev, cardExpiry: "" }));
                              }}
                              placeholder="12/28"
                              value={cardExpiry}
                            />
                            {fieldErrors.cardExpiry ? (
                              <p className="mt-1 text-xs font-medium text-[#F04452]">{fieldErrors.cardExpiry}</p>
                            ) : null}
                          </div>
                          <div>
                            <label className="text-sm font-semibold" htmlFor="card-cvc">
                              CVC
                            </label>
                            <input
                              className={`${inputClass} ${fieldErrors.cardCvc ? "border-[#F04452] focus:border-[#F04452]" : ""}`}
                              id="card-cvc"
                              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                setCardCvc(e.target.value);
                                if (fieldErrors.cardCvc) setFieldErrors((prev) => ({ ...prev, cardCvc: "" }));
                              }}
                              placeholder="123"
                              value={cardCvc}
                            />
                            {fieldErrors.cardCvc ? (
                              <p className="mt-1 text-xs font-medium text-[#F04452]">{fieldErrors.cardCvc}</p>
                            ) : null}
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
                        className={`${inputClass} ${fieldErrors.cardNumber ? "border-[#F04452] focus:border-[#F04452]" : ""}`}
                        id="stripe-card-num"
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          setCardNumber(e.target.value);
                          if (fieldErrors.cardNumber) setFieldErrors((prev) => ({ ...prev, cardNumber: "" }));
                        }}
                        placeholder="4242 4242 4242 4242"
                        value={cardNumber}
                      />
                      {fieldErrors.cardNumber ? (
                        <p className="mt-1 text-xs font-medium text-[#F04452]">{fieldErrors.cardNumber}</p>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-semibold" htmlFor="stripe-card-exp">
                          Expiry (MM/YY)
                        </label>
                        <input
                          className={`${inputClass} ${fieldErrors.cardExpiry ? "border-[#F04452] focus:border-[#F04452]" : ""}`}
                          id="stripe-card-exp"
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            setCardExpiry(e.target.value);
                            if (fieldErrors.cardExpiry) setFieldErrors((prev) => ({ ...prev, cardExpiry: "" }));
                          }}
                          placeholder="12/28"
                          value={cardExpiry}
                        />
                        {fieldErrors.cardExpiry ? (
                          <p className="mt-1 text-xs font-medium text-[#F04452]">{fieldErrors.cardExpiry}</p>
                        ) : null}
                      </div>
                      <div>
                        <label className="text-sm font-semibold" htmlFor="stripe-card-cvc">
                          CVC
                        </label>
                        <input
                          className={`${inputClass} ${fieldErrors.cardCvc ? "border-[#F04452] focus:border-[#F04452]" : ""}`}
                          id="stripe-card-cvc"
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            setCardCvc(e.target.value);
                            if (fieldErrors.cardCvc) setFieldErrors((prev) => ({ ...prev, cardCvc: "" }));
                          }}
                          placeholder="123"
                          value={cardCvc}
                        />
                        {fieldErrors.cardCvc ? (
                          <p className="mt-1 text-xs font-medium text-[#F04452]">{fieldErrors.cardCvc}</p>
                        ) : null}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Card information is securely encrypted and processed.
                    </p>
                  </div>
                )}

                {/* Primary Payment Action */}
                <div className="mt-2 flex flex-col gap-3">
                  <Button
                    className="w-full gap-2 text-base font-semibold"
                    disabled={processing}
                    onClick={handleCompletePayment}
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
                </div>
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
