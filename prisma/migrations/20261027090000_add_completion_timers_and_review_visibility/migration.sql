-- Completion evidence, confirmation timers, payout freeze, and blind reviews.

ALTER TYPE "AssignmentStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';
ALTER TYPE "AssignmentStatus" ADD VALUE IF NOT EXISTS 'DISPUTED';

ALTER TABLE "Assignment" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "Assignment" ADD COLUMN "completionNote" TEXT;
ALTER TABLE "Assignment" ADD COLUMN "completionUrl" TEXT;
ALTER TABLE "Assignment" ADD COLUMN "confirmedAt" TIMESTAMP(3);
ALTER TABLE "Assignment" ADD COLUMN "reminderSentAt" TIMESTAMP(3);
ALTER TABLE "Assignment" ADD COLUMN "autoReleaseAt" TIMESTAMP(3);
CREATE INDEX "Assignment_status_autoReleaseAt_idx" ON "Assignment"("status", "autoReleaseAt");

ALTER TABLE "Review" ADD COLUMN "publishAt" TIMESTAMP(3);
ALTER TABLE "Review" ADD COLUMN "publishedAt" TIMESTAMP(3);
CREATE INDEX "Review_taskId_publishedAt_idx" ON "Review"("taskId", "publishedAt");

-- Existing reviews predate the blind window; give them the same 14-day clock.
UPDATE "Review"
SET "publishAt" = "createdAt" + INTERVAL '14 days'
WHERE "publishAt" IS NULL;

UPDATE "Review"
SET "publishedAt" = "publishAt"
WHERE "publishAt" <= CURRENT_TIMESTAMP AND "publishedAt" IS NULL;
