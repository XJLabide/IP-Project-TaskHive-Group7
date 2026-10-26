import type { HiringMode } from "@/lib/tasks/policy";
import type { TaskLifecycleStatus } from "@/lib/tasks/lifecycle";
import type { TaskerVerificationStatus } from "@/lib/domain/access";

export type ApplicationKind = "bid" | "request";

export type ApplicationStatus =
  | "submitted"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "invalidated";

export type ApplicationTask = {
  posterId: string;
  status: TaskLifecycleStatus;
  hiringMode: HiringMode;
};

export type ApplicationDenialCode =
  | "task_not_open"
  | "own_task"
  | "verification_rejected"
  | "duplicate_application"
  | "application_rejected"
  | "wrong_hiring_mode"
  | "applications_locked"
  | "application_not_submitted"
  | "pending_verification";

export type ApplicationDecision =
  | { allowed: true }
  | { allowed: false; code: ApplicationDenialCode; reason: string };

const ALLOWED: ApplicationDecision = { allowed: true };

function deny(code: ApplicationDenialCode, reason: string): ApplicationDecision {
  return { allowed: false, code, reason };
}

export function kindForHiringMode(mode: HiringMode): ApplicationKind {
  return mode === "bidding" ? "bid" : "request";
}

const liveStatuses: readonly ApplicationStatus[] = ["submitted", "accepted"];

/** Whether an application still counts as live (visible and withdrawable). */
export function isLiveApplicationStatus(status: ApplicationStatus): boolean {
  return liveStatuses.includes(status);
}

/** Decides whether a Tasker may submit this bid or request to this task. */
export function canApply(input: {
  taskerId: string;
  kind: ApplicationKind;
  task: ApplicationTask;
  verification: TaskerVerificationStatus;
  existingStatuses: readonly ApplicationStatus[];
}): ApplicationDecision {
  if (input.task.status !== "open") {
    return deny("task_not_open", "This task is not open for applications.");
  }

  if (input.taskerId === input.task.posterId) {
    return deny("own_task", "You cannot apply to your own task.");
  }

  if (input.verification === "rejected") {
    return deny(
      "verification_rejected",
      "Your identity verification was rejected, so you cannot apply.",
    );
  }

  if (input.kind !== kindForHiringMode(input.task.hiringMode)) {
    return deny(
      "wrong_hiring_mode",
      input.task.hiringMode === "bidding"
        ? "This task accepts bids, not fixed-price requests."
        : "This task accepts fixed-price requests, not bids.",
    );
  }

  if (input.existingStatuses.some((status) => liveStatuses.includes(status))) {
    return deny("duplicate_application", "You already applied to this task.");
  }

  if (input.existingStatuses.includes("rejected")) {
    return deny(
      "application_rejected",
      "The Poster declined this application. Apply only after the task is reopened.",
    );
  }

  return ALLOWED;
}

/** A Tasker may withdraw until the Poster starts hiring or the task closes. */
export function canWithdraw(input: {
  applicationStatus: ApplicationStatus;
  taskStatus: TaskLifecycleStatus;
}): ApplicationDecision {
  if (input.applicationStatus !== "submitted") {
    return deny(
      "application_not_submitted",
      "Only a submitted application can be withdrawn.",
    );
  }

  if (input.taskStatus !== "open" && input.taskStatus !== "pending_payment") {
    return deny(
      "applications_locked",
      "Applications are locked once a Tasker is assigned or the task closes.",
    );
  }

  return ALLOWED;
}

/** A Poster may approve only a submitted application from a verified Tasker. */
export function canApprove(input: {
  applicationStatus: ApplicationStatus;
  taskStatus: TaskLifecycleStatus;
  verification: TaskerVerificationStatus;
}): ApplicationDecision {
  if (input.applicationStatus !== "submitted") {
    return deny(
      "application_not_submitted",
      "Only a submitted application can be approved.",
    );
  }

  if (input.taskStatus !== "open") {
    return deny("applications_locked", "This task is no longer open for hiring.");
  }

  if (input.verification === "rejected") {
    return deny(
      "verification_rejected",
      "This Tasker's identity verification was rejected.",
    );
  }

  if (input.verification !== "verified") {
    return deny(
      "pending_verification",
      "This Tasker must finish identity verification before assignment.",
    );
  }

  return ALLOWED;
}
