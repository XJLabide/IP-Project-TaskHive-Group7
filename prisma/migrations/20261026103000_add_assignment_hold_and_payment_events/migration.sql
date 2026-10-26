-- Assignment hold, provider-neutral payment boundary, and idempotent callbacks.

CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'CANCELLED');

ALTER TABLE "Assignment" ADD COLUMN "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING_PAYMENT';
ALTER TABLE "Assignment" ADD COLUMN "holdExpiresAt" TIMESTAMP(3);
ALTER TABLE "Assignment" ADD COLUMN "activatedAt" TIMESTAMP(3);
ALTER TABLE "Assignment" ADD COLUMN "expiredAt" TIMESTAMP(3);
CREATE INDEX "Assignment_status_holdExpiresAt_idx" ON "Assignment"("status", "holdExpiresAt");

-- Rename the provider-specific column and add the safe provider metadata.
ALTER TABLE "Payment" RENAME COLUMN "stripeCheckoutSession" TO "providerCheckoutId";
ALTER TABLE "Payment" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'unconfigured';
ALTER TABLE "Payment" ADD COLUMN "checkoutUrl" TEXT;
ALTER TABLE "Payment" ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Payment" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'PHP';
ALTER TABLE "Payout" ADD COLUMN "providerReference" TEXT;
CREATE UNIQUE INDEX "Payment_taskId_key" ON "Payment"("taskId");
CREATE INDEX "Payment_provider_providerCheckoutId_idx" ON "Payment"("provider", "providerCheckoutId");

CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "providerReference" TEXT,
    "paymentId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentEvent_provider_eventId_key" ON "PaymentEvent"("provider", "eventId");
CREATE INDEX "PaymentEvent_paymentId_idx" ON "PaymentEvent"("paymentId");

ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
