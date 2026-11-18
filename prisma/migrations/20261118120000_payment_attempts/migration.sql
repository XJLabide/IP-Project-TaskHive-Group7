CREATE TYPE "PaymentAttemptStatus" AS ENUM ('CREATING', 'CHECKOUT_STARTED', 'FAILED', 'SUCCEEDED', 'LATE', 'REFUNDED', 'RECONCILIATION_REQUIRED');

CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "providerCheckoutId" TEXT,
    "checkoutUrl" TEXT,
    "providerCallStarted" BOOLEAN NOT NULL DEFAULT false,
    "amountCents" INTEGER NOT NULL,
    "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'CREATING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentAttempt_idempotencyKey_key" ON "PaymentAttempt"("idempotencyKey");
CREATE UNIQUE INDEX "PaymentAttempt_provider_providerCheckoutId_key" ON "PaymentAttempt"("provider", "providerCheckoutId");
CREATE INDEX "PaymentAttempt_paymentId_status_idx" ON "PaymentAttempt"("paymentId", "status");
CREATE UNIQUE INDEX "PaymentAttempt_one_active_per_payment_key"
    ON "PaymentAttempt"("paymentId")
    WHERE "status" IN ('CREATING', 'CHECKOUT_STARTED', 'RECONCILIATION_REQUIRED');

ALTER TABLE "PaymentEvent" ADD COLUMN "amountCents" INTEGER;
ALTER TABLE "PaymentEvent" ADD COLUMN "attemptId" TEXT;
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_attemptId_fkey"
    FOREIGN KEY ("attemptId") REFERENCES "PaymentAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
