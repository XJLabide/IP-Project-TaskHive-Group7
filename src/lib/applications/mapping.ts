import { BidStatus as DbApplicationStatus } from "@prisma/client";
import type { ApplicationStatus } from "./rules";

/** Bid and TaskRequest share one status enum; keep the domain translation here. */
export const toDomainApplicationStatus: Record<DbApplicationStatus, ApplicationStatus> = {
  [DbApplicationStatus.SUBMITTED]: "submitted",
  [DbApplicationStatus.ACCEPTED]: "accepted",
  [DbApplicationStatus.REJECTED]: "rejected",
  [DbApplicationStatus.WITHDRAWN]: "withdrawn",
  [DbApplicationStatus.INVALIDATED]: "invalidated",
};

export const toDbApplicationStatus: Record<ApplicationStatus, DbApplicationStatus> = {
  submitted: DbApplicationStatus.SUBMITTED,
  accepted: DbApplicationStatus.ACCEPTED,
  rejected: DbApplicationStatus.REJECTED,
  withdrawn: DbApplicationStatus.WITHDRAWN,
  invalidated: DbApplicationStatus.INVALIDATED,
};
