-- Applications withdrawn by a Poster's material edit are distinct from a
-- Tasker choosing to withdraw. This value is used by the application, not by
-- this migration, so adding it needs no follow-up statement in this file.
ALTER TYPE "BidStatus" ADD VALUE IF NOT EXISTS 'INVALIDATED';
