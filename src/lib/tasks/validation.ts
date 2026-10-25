import { categoryForFulfillment, type FulfillmentMode, type HiringMode } from "./policy";

export type TaskFields = {
  title: string;
  description: string;
  category: string;
  budgetCents: number;
  deadline: Date | string | null;
  fulfillmentMode: FulfillmentMode;
  hiringMode: HiringMode;
  locationLabel: string | null;
};

export type TaskField = keyof TaskFields;
export type TaskFieldErrors = Partial<Record<TaskField, string>>;

const fulfillmentModes: FulfillmentMode[] = ["local", "remote"];
const hiringModes: HiringMode[] = ["bidding", "fixed_price"];

type Deadline = Date | null | "invalid";

function readDeadline(value: Date | string | null): Deadline {
  if (value === null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "invalid" : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "invalid" : parsed;
}

/**
 * Checks the fields every task needs, plus the fields its fulfillment mode
 * requires. A draft may leave its deadline open; publishing is stricter.
 */
export function validateTaskDraft(input: TaskFields): TaskFieldErrors {
  const errors: TaskFieldErrors = {};

  if (input.title.trim().length < 3) {
    errors.title = "Enter a title with at least 3 characters.";
  }

  if (input.description.trim().length < 10) {
    errors.description = "Add a description with at least 10 characters.";
  }

  if (!Number.isInteger(input.budgetCents) || input.budgetCents <= 0) {
    errors.budgetCents = "Enter a price greater than zero.";
  }

  if (!fulfillmentModes.includes(input.fulfillmentMode)) {
    errors.fulfillmentMode = "Choose local or remote fulfillment.";
  }

  if (!hiringModes.includes(input.hiringMode)) {
    errors.hiringMode = "Choose bidding or fixed-price hiring.";
  }

  if (fulfillmentModes.includes(input.fulfillmentMode)) {
    const category = categoryForFulfillment(input.category, input.fulfillmentMode);
    if (!category.allowed) errors.category = category.reason;

    const location = input.locationLabel?.trim() ?? "";
    if (input.fulfillmentMode === "local" && location.length < 2) {
      errors.locationLabel = "Local tasks need a service location.";
    }
    if (input.fulfillmentMode === "remote" && location.length > 0) {
      errors.locationLabel = "Remote tasks do not use a service location.";
    }
  }

  if (readDeadline(input.deadline) === "invalid") {
    errors.deadline = "Enter a valid deadline.";
  }

  return errors;
}

/** Publishing adds the deadline requirement on top of the draft checks. */
export function validateTaskForPublish(input: TaskFields, now: Date): TaskFieldErrors {
  const errors = validateTaskDraft(input);

  if (!errors.deadline) {
    const deadline = readDeadline(input.deadline);
    if (!deadline || deadline === "invalid") {
      errors.deadline = "Choose a deadline before publishing.";
    } else if (deadline.getTime() <= now.getTime()) {
      errors.deadline = "The deadline must be in the future.";
    }
  }

  return errors;
}

export function hasTaskErrors(errors: TaskFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
