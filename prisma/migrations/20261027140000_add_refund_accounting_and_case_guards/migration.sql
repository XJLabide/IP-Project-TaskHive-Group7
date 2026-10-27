-- Refund accounting and one open support case per task.

ALTER TABLE "Payment" ADD COLUMN "refundedCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Payment" ADD COLUMN "refundedAt" TIMESTAMP(3);

ALTER TABLE "Dispute" ADD COLUMN "reviewDueAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "CancellationRequest_open_task_key"
  ON "CancellationRequest"("taskId")
  WHERE "status" IN ('OPEN', 'REVIEWING');

CREATE UNIQUE INDEX "Dispute_open_task_key"
  ON "Dispute"("taskId")
  WHERE "status" IN ('OPEN', 'REVIEWING');
