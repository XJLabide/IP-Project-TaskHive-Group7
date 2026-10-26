import { categoryForFulfillment, type FulfillmentMode, type HiringMode } from "./policy";
import { isCoordinates } from "./location";

export type TaskFields = {
  title: string;
  description: string;
  category: string;
  budgetCents: number;
  deadline: Date | string | null;
  fulfillmentMode: FulfillmentMode;
  hiringMode: HiringMode;
  locationLabel: string | null;
  /** Exact service address; private until payment succeeds on an active assignment. */
  addressLine?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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
 * Checks the fields that are present. A draft may be incomplete: an empty
 * title, description, price, category, or local location is allowed until the
 * Poster publishes. Values that are present must still be valid.
 */
export function validateTaskDraft(input: TaskFields): TaskFieldErrors {
  const errors: TaskFieldErrors = {};

  const title = input.title.trim();
  if (title.length > 0 && title.length < 3) {
    errors.title = "Enter a title with at least 3 characters.";
  }

  const description = input.description.trim();
  if (description.length > 0 && description.length < 10) {
    errors.description = "Add a description with at least 10 characters.";
  }

  if (!Number.isInteger(input.budgetCents) || input.budgetCents < 0) {
    errors.budgetCents = "Enter a price of zero or more.";
  }

  if (!fulfillmentModes.includes(input.fulfillmentMode)) {
    errors.fulfillmentMode = "Choose local or remote fulfillment.";
  }

  if (!hiringModes.includes(input.hiringMode)) {
    errors.hiringMode = "Choose bidding or fixed-price hiring.";
  }

  if (fulfillmentModes.includes(input.fulfillmentMode)) {
    const category = input.category.trim();
    if (category.length > 0) {
      const decision = categoryForFulfillment(category, input.fulfillmentMode);
      if (!decision.allowed) errors.category = decision.reason;
    }

    const location = input.locationLabel?.trim() ?? "";
    if (
      input.fulfillmentMode === "local" &&
      location.length > 0 &&
      location.length < 2
    ) {
      errors.locationLabel = "Enter a service location.";
    }

    const address = input.addressLine?.trim() ?? "";
    if (input.fulfillmentMode === "local" && address.length > 0 && address.length < 5) {
      errors.addressLine = "Enter the complete service address.";
    }

    if (input.fulfillmentMode === "local") {
      const hasPoint =
        input.latitude !== null &&
        input.latitude !== undefined &&
        input.longitude !== null &&
        input.longitude !== undefined;
      const hasHalf =
        (input.latitude !== null && input.latitude !== undefined) !==
        (input.longitude !== null && input.longitude !== undefined);

      if (hasHalf) {
        errors.latitude = "Send both a latitude and a longitude.";
      } else if (hasPoint && !isCoordinates({ latitude: input.latitude, longitude: input.longitude })) {
        errors.latitude = "Enter coordinates within the valid range.";
      }
    }
  }

  if (readDeadline(input.deadline) === "invalid") {
    errors.deadline = "Enter a valid deadline.";
  }

  return errors;
}

/** Publishing adds the completeness and future-deadline requirements. */
export function validateTaskForPublish(input: TaskFields, now: Date): TaskFieldErrors {
  const errors = validateTaskDraft(input);

  if (input.title.trim().length < 3) {
    errors.title = "Enter a title with at least 3 characters.";
  }

  if (input.description.trim().length < 10) {
    errors.description = "Add a description with at least 10 characters.";
  }

  if (!Number.isInteger(input.budgetCents) || input.budgetCents <= 0) {
    errors.budgetCents = "Enter a price greater than zero.";
  }

  if (input.category.trim().length === 0) {
    errors.category = "Choose a launch-approved category.";
  }

  if (
    input.fulfillmentMode === "local" &&
    (input.locationLabel?.trim() ?? "").length < 2
  ) {
    errors.locationLabel = "Local tasks need a service location.";
  }

  if (
    input.fulfillmentMode === "local" &&
    (input.latitude === null || input.latitude === undefined ||
      input.longitude === null || input.longitude === undefined)
  ) {
    errors.latitude = "Choose the approximate service area on the map.";
  }

  if (input.fulfillmentMode === "local" && (input.addressLine?.trim() ?? "").length < 5) {
    errors.addressLine = "Local tasks need an exact service address.";
  }

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
