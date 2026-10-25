import {
  FulfillmentMode as DbFulfillmentMode,
  HiringMode as DbHiringMode,
  TaskStatus as DbTaskStatus,
} from "@prisma/client";
import type { TaskLifecycleStatus } from "./lifecycle";
import type { FulfillmentMode, HiringMode } from "./policy";

/** Single place where the database enums and the task domain meet. */

export const toDomainTaskStatus: Record<DbTaskStatus, TaskLifecycleStatus> = {
  [DbTaskStatus.DRAFT]: "draft",
  [DbTaskStatus.OPEN]: "open",
  [DbTaskStatus.PENDING_APPROVAL]: "pending_approval",
  [DbTaskStatus.PENDING_PAYMENT]: "pending_payment",
  [DbTaskStatus.ASSIGNED]: "assigned",
  [DbTaskStatus.IN_PROGRESS]: "in_progress",
  [DbTaskStatus.AWAITING_CONFIRMATION]: "awaiting_confirmation",
  [DbTaskStatus.COMPLETED]: "completed",
  [DbTaskStatus.CANCELLED]: "cancelled",
  [DbTaskStatus.DISPUTED]: "disputed",
};

export const toDbTaskStatus: Record<TaskLifecycleStatus, DbTaskStatus> = {
  draft: DbTaskStatus.DRAFT,
  open: DbTaskStatus.OPEN,
  pending_approval: DbTaskStatus.PENDING_APPROVAL,
  pending_payment: DbTaskStatus.PENDING_PAYMENT,
  assigned: DbTaskStatus.ASSIGNED,
  in_progress: DbTaskStatus.IN_PROGRESS,
  awaiting_confirmation: DbTaskStatus.AWAITING_CONFIRMATION,
  completed: DbTaskStatus.COMPLETED,
  cancelled: DbTaskStatus.CANCELLED,
  disputed: DbTaskStatus.DISPUTED,
};

export const toDbFulfillment: Record<FulfillmentMode, DbFulfillmentMode> = {
  local: DbFulfillmentMode.LOCAL,
  remote: DbFulfillmentMode.REMOTE,
};

export const toDomainFulfillment: Record<DbFulfillmentMode, FulfillmentMode> = {
  [DbFulfillmentMode.LOCAL]: "local",
  [DbFulfillmentMode.REMOTE]: "remote",
};

export const toDbHiring: Record<HiringMode, DbHiringMode> = {
  bidding: DbHiringMode.BIDDING,
  fixed_price: DbHiringMode.FIXED_PRICE,
};

export const toDomainHiring: Record<DbHiringMode, HiringMode> = {
  [DbHiringMode.BIDDING]: "bidding",
  [DbHiringMode.FIXED_PRICE]: "fixed_price",
};
