-- Add the draft state in its own migration so the new value is committed
-- before later statements use it as a default.
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
