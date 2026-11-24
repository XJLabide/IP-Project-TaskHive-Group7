-- Store only provider object identifiers; no card data or raw webhook bodies.
ALTER TABLE "PaymentAttempt"
  ADD COLUMN "providerPaymentIntentId" TEXT,
  ADD COLUMN "providerChargeId" TEXT;
ALTER TABLE "PaymentEvent"
  ADD COLUMN "providerPaymentIntentId" TEXT,
  ADD COLUMN "providerChargeId" TEXT;
CREATE UNIQUE INDEX "PaymentAttempt_provider_providerPaymentIntentId_key"
  ON "PaymentAttempt"("provider", "providerPaymentIntentId");
CREATE UNIQUE INDEX "PaymentAttempt_provider_providerChargeId_key"
  ON "PaymentAttempt"("provider", "providerChargeId");
