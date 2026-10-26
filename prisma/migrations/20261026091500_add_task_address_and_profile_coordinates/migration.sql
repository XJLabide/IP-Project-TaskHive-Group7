-- Staged location privacy and saved search origin.
-- The Poster's exact service address is stored separately from the public
-- approximate area, and a saved profile location becomes the default origin
-- for local discovery.

ALTER TABLE "Task" ADD COLUMN "addressLine" TEXT;

ALTER TABLE "Profile" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "Profile" ADD COLUMN "longitude" DOUBLE PRECISION;
