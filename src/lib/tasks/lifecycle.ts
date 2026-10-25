import type { FulfillmentMode, HiringMode } from "./policy";

/** The authoring lifecycle, plus the post-publication states it must not delete. */
export type TaskLifecycleStatus =
  | "draft"
  | "open"
  | "pending_approval"
  | "pending_payment"
  | "assigned"
  | "in_progress"
  | "awaiting_confirmation"
  | "completed"
  | "cancelled"
  | "disputed";

export type MaterialTaskFields = {
  title: string;
  description: string;
  budgetCents: number;
  deadline: Date | string | null;
  locationLabel: string | null;
  fulfillmentMode: FulfillmentMode;
  hiringMode: HiringMode;
};

export const materialFields = [
  "title",
  "description",
  "budgetCents",
  "deadline",
  "locationLabel",
  "fulfillmentMode",
  "hiringMode",
] as const;

export type MaterialField = (typeof materialFields)[number];

function normalizedText(value: string): string {
  return value.trim();
}

function normalizedLocation(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function normalizedDeadline(value: Date | string | null): string | null {
  if (value === null) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value).trim() : parsed.toISOString();
}

/**
 * The fields whose change invalidates applications. Category is intentionally
 * absent: the product rule names title/scope, price, deadline, location, and
 * the two modes, not the category.
 */
export function changedMaterialFields(
  before: MaterialTaskFields,
  after: MaterialTaskFields,
): MaterialField[] {
  const changed: MaterialField[] = [];

  if (normalizedText(before.title) !== normalizedText(after.title)) changed.push("title");
  if (normalizedText(before.description) !== normalizedText(after.description)) {
    changed.push("description");
  }
  if (before.budgetCents !== after.budgetCents) changed.push("budgetCents");
  if (normalizedDeadline(before.deadline) !== normalizedDeadline(after.deadline)) {
    changed.push("deadline");
  }
  if (normalizedLocation(before.locationLabel) !== normalizedLocation(after.locationLabel)) {
    changed.push("locationLabel");
  }
  if (before.fulfillmentMode !== after.fulfillmentMode) changed.push("fulfillmentMode");
  if (before.hiringMode !== after.hiringMode) changed.push("hiringMode");

  return changed;
}

export function isMaterialTaskChange(
  before: MaterialTaskFields,
  after: MaterialTaskFields,
): boolean {
  return changedMaterialFields(before, after).length > 0;
}

export type TaskEffect =
  | { type: "clear_applications" }
  | { type: "notify_applicants" };

export type TaskEvent =
  | { type: "publish" }
  | { type: "edit"; materialFields: MaterialField[]; openApplications: number }
  | { type: "cancel" }
  | { type: "delete" };

export type TaskTransition =
  | { ok: true; status: TaskLifecycleStatus | null; effects: TaskEffect[] }
  | {
      ok: false;
      code: "invalid_transition" | "published_task_must_be_cancelled";
      reason: string;
    };

export function canDelete(status: TaskLifecycleStatus): boolean {
  return status === "draft";
}

export function canCancel(status: TaskLifecycleStatus): boolean {
  return status === "open";
}

/** A narrow state machine for the authoring actions a Poster can take. */
export function transition(
  status: TaskLifecycleStatus,
  event: TaskEvent,
): TaskTransition {
  if (event.type === "publish") {
    if (status !== "draft") {
      return {
        ok: false,
        code: "invalid_transition",
        reason: "Only a draft can be published.",
      };
    }

    return { ok: true, status: "open", effects: [] };
  }

  if (event.type === "edit") {
    if (status !== "draft" && status !== "open") {
      return {
        ok: false,
        code: "invalid_transition",
        reason: "Only a draft or open task can be edited.",
      };
    }

    const material =
      event.materialFields.length > 0 && event.openApplications > 0;
    return {
      ok: true,
      status,
      effects: material
        ? [{ type: "clear_applications" }, { type: "notify_applicants" }]
        : [],
    };
  }

  if (event.type === "cancel") {
    if (status !== "open") {
      return {
        ok: false,
        code: "invalid_transition",
        reason: "Only an open published task can be cancelled.",
      };
    }

    return { ok: true, status: "cancelled", effects: [] };
  }

  if (status === "draft") {
    return { ok: true, status: null, effects: [] };
  }

  if (status === "cancelled") {
    return {
      ok: false,
      code: "invalid_transition",
      reason: "Cancelled tasks are retained in history and cannot be deleted.",
    };
  }

  return {
    ok: false,
    code: "published_task_must_be_cancelled",
    reason: "Published tasks must be cancelled instead of deleted.",
  };
}
