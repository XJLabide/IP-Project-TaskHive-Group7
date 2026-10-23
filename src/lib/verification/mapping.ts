import {
  VerificationAppealStatus as DbAppealStatus,
  VerificationStatus as DbStatus,
} from "@prisma/client";
import type { TaskerVerificationStatus } from "@/lib/domain/access";
import type { AppealStatus } from "./lifecycle";

/** Single place where the database enums and the domain states meet. */

export const toDomainStatus: Record<DbStatus, TaskerVerificationStatus> = {
  [DbStatus.NOT_STARTED]: "not_started",
  [DbStatus.PENDING]: "pending",
  [DbStatus.VERIFIED]: "verified",
  [DbStatus.REJECTED]: "rejected",
};

export const toDbStatus: Record<TaskerVerificationStatus, DbStatus> = {
  not_started: DbStatus.NOT_STARTED,
  pending: DbStatus.PENDING,
  verified: DbStatus.VERIFIED,
  rejected: DbStatus.REJECTED,
};

export const toDomainAppeal: Record<DbAppealStatus, AppealStatus> = {
  [DbAppealStatus.NONE]: "none",
  [DbAppealStatus.PENDING]: "pending",
  [DbAppealStatus.APPROVED]: "approved",
  [DbAppealStatus.DENIED]: "denied",
};

export const toDbAppeal: Record<AppealStatus, DbAppealStatus> = {
  none: DbAppealStatus.NONE,
  pending: DbAppealStatus.PENDING,
  approved: DbAppealStatus.APPROVED,
  denied: DbAppealStatus.DENIED,
};
