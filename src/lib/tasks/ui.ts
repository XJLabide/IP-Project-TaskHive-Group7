import {
  categoriesFor,
  type FulfillmentMode,
  type HiringMode,
  type LaunchCategory,
} from "./policy";
import {
  changedMaterialFields,
  materialFieldLabels,
  type MaterialField,
} from "./lifecycle";
import {
  validateTaskDraft,
  validateTaskForPublish,
  type TaskFieldErrors,
  type TaskFields,
} from "./validation";
import type { TaskFormSource, UiTaskStatus } from "./types";
import type { TaskField } from "./validation";

export type TaskFormValues = {
  title: string;
  description: string;
  category: string;
  fulfillmentMode: FulfillmentMode;
  hiringMode: HiringMode;
  budget: string;
  location: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  deadline: string;
};

export const taskFieldLabels: Record<TaskField, string> = {
  title: "Title",
  description: "Description",
  category: "Category",
  budgetCents: "Price",
  deadline: "Deadline",
  fulfillmentMode: "Fulfillment",
  hiringMode: "Hiring",
  locationLabel: "Approximate area",
  addressLine: "Exact address",
  latitude: "Latitude",
  longitude: "Longitude",
};

export function taskStatusClass(status: UiTaskStatus): string {
  if (status === "open" || status === "assigned" || status === "completed") {
    return "border-[#75D333]/40 bg-[#75D333]/15 text-[#2f6b12] dark:text-[#75D333]";
  }
  if (
    status === "draft" ||
    status === "pending_payment" ||
    status === "awaiting_confirmation" ||
    status === "cancellation_review"
  ) {
    return "border-[#FFC800]/40 bg-[#FFD50D]/25 text-zinc-800 dark:bg-[#FFC800]/15 dark:text-zinc-100";
  }
  return "border-[#F04452]/40 bg-[#F04452]/10 text-[#a01a26] dark:text-[#F04452]";
}

const manilaOffsetMs = 8 * 60 * 60 * 1000;

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** The launch categories offered for the chosen fulfillment mode. */
export function categoryOptions(fulfillment: FulfillmentMode): LaunchCategory[] {
  return categoriesFor(fulfillment);
}

export function taskStatusLabel(status: UiTaskStatus): string {
  if (status === "draft") return "Draft";
  if (status === "cancelled") return "Cancelled";
  if (status === "pending_payment") return "Awaiting payment";
  if (status === "assigned") return "Assigned";
  if (status === "awaiting_confirmation") return "Awaiting confirmation";
  if (status === "completed") return "Completed";
  if (status === "cancellation_review") return "Cancellation review";
  if (status === "disputed") return "Disputed";
  return "Open";
}

export function budgetToCents(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;

  const amount = Number(trimmed);
  return Number.isFinite(amount) ? Math.round(amount * 100) : Number.NaN;
}

/** A `datetime-local` value is interpreted as Philippines time. */
export function fromDateTimeLocal(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)
    ? `${trimmed}:00`
    : trimmed;
  const parsed = new Date(`${withSeconds}+08:00`);

  return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
}

export function toDateTimeLocal(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const manila = new Date(date.getTime() + manilaOffsetMs);
  return `${manila.getUTCFullYear()}-${pad(manila.getUTCMonth() + 1)}-${pad(
    manila.getUTCDate(),
  )}T${pad(manila.getUTCHours())}:${pad(manila.getUTCMinutes())}`;
}

export function formatTaskDeadline(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No deadline";

  const manila = new Date(date.getTime() + manilaOffsetMs);
  const hours = manila.getUTCHours();
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;

  return `${months[manila.getUTCMonth()]} ${manila.getUTCDate()}, ${manila.getUTCFullYear()}, ${hour12}:${pad(
    manila.getUTCMinutes(),
  )} ${suffix}`;
}

export function toTaskFormValues(task: TaskFormSource): TaskFormValues {
  return {
    title: task.title,
    description: task.description,
    category: task.category,
    fulfillmentMode: task.fulfillmentMode,
    hiringMode: task.hiringMode,
    budget: task.budget > 0 ? String(task.budget) : "",
    location: task.location ?? "",
    address: task.addressLine ?? "",
    latitude: task.latitude ?? null,
    longitude: task.longitude ?? null,
    deadline: toDateTimeLocal(task.deadline),
  };
}

export function emptyTaskForm(fulfillment: FulfillmentMode = "local"): TaskFormValues {
  return {
    title: "",
    description: "",
    category: categoryOptions(fulfillment)[0]?.label ?? "",
    fulfillmentMode: fulfillment,
    hiringMode: "bidding",
    budget: "",
    location: "",
    address: "",
    latitude: null,
    longitude: null,
    deadline: "",
  };
}

export function toTaskFields(values: TaskFormValues): TaskFields {
  return {
    title: values.title,
    description: values.description,
    category: values.category,
    budgetCents: budgetToCents(values.budget),
    deadline: fromDateTimeLocal(values.deadline),
    fulfillmentMode: values.fulfillmentMode,
    hiringMode: values.hiringMode,
    locationLabel:
      values.fulfillmentMode === "local" ? values.location.trim() || null : null,
    addressLine:
      values.fulfillmentMode === "local" ? values.address.trim() || null : null,
    latitude: values.fulfillmentMode === "local" ? values.latitude : null,
    longitude: values.fulfillmentMode === "local" ? values.longitude : null,
  };
}

export function taskToFields(task: TaskFormSource): TaskFields {
  return {
    title: task.title,
    description: task.description,
    category: task.category,
    budgetCents: Math.round(task.budget * 100),
    deadline: task.deadline,
    fulfillmentMode: task.fulfillmentMode,
    hiringMode: task.hiringMode,
    locationLabel: task.location,
    addressLine: task.addressLine ?? null,
    latitude: task.fulfillmentMode === "local" ? task.latitude ?? null : null,
    longitude: task.fulfillmentMode === "local" ? task.longitude ?? null : null,
  };
}

export function taskFormErrors(
  values: TaskFormValues,
  options: { publish: boolean; now?: Date },
): TaskFieldErrors {
  const fields = toTaskFields(values);
  return options.publish
    ? validateTaskForPublish(fields, options.now ?? new Date())
    : validateTaskDraft(fields);
}

function listLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

export type MaterialEditNotice = {
  fields: MaterialField[];
  message: string;
};

/**
 * The warning shown before saving an open task. It only appears when a material
 * field changed and there are applications to reset.
 */
export function materialEditNotice(
  current: TaskFormSource,
  values: TaskFormValues,
  applications: number,
): MaterialEditNotice | null {
  if (applications <= 0) return null;

  const fields = changedMaterialFields(taskToFields(current), toTaskFields(values));
  if (fields.length === 0) return null;

  const listed = listLabels(fields.map((field) => materialFieldLabels[field]));
  const noun = applications === 1 ? "application" : "applications";
  const audience = applications === 1 ? "that Tasker" : "those Taskers";

  return {
    fields,
    message: `This change updates ${listed}, so ${applications} pending ${noun} will be reset and ${audience} will be notified.`,
  };
}
