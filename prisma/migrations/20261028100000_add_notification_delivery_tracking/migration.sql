CREATE TYPE "NotificationEmailStatus" AS ENUM ('PENDING', 'FAILED', 'SENT', 'SKIPPED');

ALTER TABLE "Notification"
ADD COLUMN "eventKey" TEXT,
ADD COLUMN "href" TEXT,
ADD COLUMN "emailStatus" "NotificationEmailStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "emailSentAt" TIMESTAMP(3),
ADD COLUMN "emailError" TEXT;

UPDATE "Notification"
SET "eventKey" = 'legacy:' || "id",
    "emailStatus" = 'SKIPPED';

ALTER TABLE "Notification"
ALTER COLUMN "eventKey" SET NOT NULL;

CREATE UNIQUE INDEX "Notification_eventKey_key" ON "Notification"("eventKey");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "Notification_emailStatus_createdAt_idx" ON "Notification"("emailStatus", "createdAt");

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
