-- Backfill and separation for task authoring.
-- Creates the separate fulfillment/hiring enums, keeps existing applications
-- and history, and replaces the old combined mode plus auto-approval field.

-- CreateEnum
CREATE TYPE "FulfillmentMode" AS ENUM ('LOCAL', 'REMOTE');

-- CreateEnum
CREATE TYPE "HiringMode" AS ENUM ('BIDDING', 'FIXED_PRICE');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "fulfillmentMode" "FulfillmentMode";
ALTER TABLE "Task" ADD COLUMN "hiringMode" "HiringMode";
ALTER TABLE "Task" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "cancelledAt" TIMESTAMP(3);

-- Backfill existing rows: hiring mode comes from the old combined enum.
-- Existing tasks were stored as local work; a remote flag did not exist before.
UPDATE "Task"
SET "hiringMode" = CASE
  WHEN "mode" = 'BIDDING' THEN 'BIDDING'::"HiringMode"
  ELSE 'FIXED_PRICE'::"HiringMode"
END;

UPDATE "Task"
SET "fulfillmentMode" = 'LOCAL'::"FulfillmentMode"
WHERE "fulfillmentMode" IS NULL;

UPDATE "Task"
SET "publishedAt" = "createdAt"
WHERE "status" <> 'DRAFT';

ALTER TABLE "Task" ALTER COLUMN "fulfillmentMode" SET NOT NULL;
ALTER TABLE "Task" ALTER COLUMN "hiringMode" SET NOT NULL;
ALTER TABLE "Task" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- The separated modes and the manual-selection rule replace these fields.
ALTER TABLE "Task" DROP COLUMN "mode";
ALTER TABLE "Task" DROP COLUMN "autoApprove";

-- The old combined enum is no longer used.
DROP TYPE "TaskMode";
