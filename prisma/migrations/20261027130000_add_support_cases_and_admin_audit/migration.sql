-- Support cases, cancellation review, resolution outcomes, and auditable Admin decisions.

ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'CANCELLATION_REVIEW';

CREATE TYPE "SupportResolution" AS ENUM ('FULL_REFUND', 'PARTIAL_PAYOUT', 'FULL_PAYOUT');

ALTER TABLE "Dispute" ADD COLUMN "resolution" "SupportResolution";
ALTER TABLE "Dispute" ADD COLUMN "payoutCents" INTEGER;
ALTER TABLE "Dispute" ADD COLUMN "resolvedById" TEXT;
ALTER TABLE "Dispute" ADD COLUMN "resolvedAt" TIMESTAMP(3);
CREATE INDEX "Dispute_status_createdAt_idx" ON "Dispute"("status", "createdAt");
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "CancellationRequest" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ModerationStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" "SupportResolution",
    "payoutCents" INTEGER,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "reviewDueAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CancellationRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CancellationRequest_status_reviewDueAt_idx" ON "CancellationRequest"("status", "reviewDueAt");
CREATE INDEX "CancellationRequest_taskId_idx" ON "CancellationRequest"("taskId");
ALTER TABLE "CancellationRequest" ADD CONSTRAINT "CancellationRequest_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CancellationRequest" ADD CONSTRAINT "CancellationRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CancellationRequest" ADD CONSTRAINT "CancellationRequest_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AdminAction" ADD COLUMN "metadata" JSONB;
CREATE INDEX "AdminAction_targetType_targetId_idx" ON "AdminAction"("targetType", "targetId");
CREATE INDEX "AdminAction_adminId_createdAt_idx" ON "AdminAction"("adminId", "createdAt");
