import {
  isExcludedCategory,
  findLaunchCategory,
  type FulfillmentMode,
  type HiringMode,
} from "./policy";
import { isCoordinates, MAX_RADIUS_KM, MIN_RADIUS_KM, type Coordinates } from "./location";

/** The task facts a public filter can match against. */
export type PublicTaskCandidate = {
  title: string;
  description: string;
  category: string | null;
  areaLabel: string | null;
  fulfillmentMode: FulfillmentMode;
  hiringMode: HiringMode;
  budgetCents: number;
  deadline: Date | null;
};

export type PublicTaskFilters = {
  search: string | null;
  category: string | null;
  fulfillmentMode: FulfillmentMode | null;
  hiringMode: HiringMode | null;
  budgetMinCents: number | null;
  budgetMaxCents: number | null;
  deadlineBefore: Date | null;
};

export type PublicTaskSort =
  | "recommended"
  | "nearest"
  | "budget_asc"
  | "budget_desc"
  | "deadline";

export const publicTaskSorts: readonly PublicTaskSort[] = [
  "recommended",
  "nearest",
  "budget_asc",
  "budget_desc",
  "deadline",
];

export type PublicTaskQuery = {
  filters: PublicTaskFilters;
  origin: Coordinates | null;
  radiusKm: number | null;
  sort: PublicTaskSort;
  page: number;
  pageSize: number;
};

export type PublicTaskQueryResult =
  | { ok: true; query: PublicTaskQuery }
  | { ok: false; issues: Record<string, string> };

export const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MAX_SEARCH_LENGTH = 100;

type NumberParam =
  | { present: false }
  | { present: true; value: number }
  | { present: true; invalid: true };

function numberParam(params: URLSearchParams, name: string): NumberParam {
  const raw = params.get(name);
  if (raw === null || raw.trim() === "") return { present: false };

  const value = Number(raw);
  return Number.isFinite(value) ? { present: true, value } : { present: true, invalid: true };
}

/** Parses a public discovery request. Guests may send no origin at all. */
export function parsePublicTaskQuery(params: URLSearchParams): PublicTaskQueryResult {
  const issues: Record<string, string> = {};

  const rawSearch = params.get("q")?.trim() ?? "";
  if (rawSearch.length > MAX_SEARCH_LENGTH) {
    issues.q = "Keep the search to 100 characters or fewer.";
  }

  let category: string | null = null;
  const rawCategory = params.get("category")?.trim() ?? "";
  if (rawCategory) {
    if (isExcludedCategory(rawCategory)) {
      issues.category =
        "This category is not available at launch because the work is high-risk.";
    } else {
      const decision = findLaunchCategory(rawCategory);
      if (!decision) {
        issues.category = "Choose a launch-approved category.";
      } else {
        category = decision.label;
      }
    }
  }

  const rawFulfillment = params.get("fulfillment")?.trim() ?? "";
  const fulfillmentMode =
    rawFulfillment === "local" || rawFulfillment === "remote"
      ? (rawFulfillment as FulfillmentMode)
      : null;
  if (rawFulfillment && !fulfillmentMode) {
    issues.fulfillment = "Choose local or remote fulfillment.";
  }

  const rawHiring = params.get("hiring")?.trim() ?? "";
  const hiringMode =
    rawHiring === "bidding" || rawHiring === "fixed_price"
      ? (rawHiring as HiringMode)
      : null;
  if (rawHiring && !hiringMode) {
    issues.hiring = "Choose bidding or fixed-price hiring.";
  }

  const budgetMin = numberParam(params, "budgetMinCents");
  const budgetMax = numberParam(params, "budgetMaxCents");
  if ("invalid" in budgetMin) issues.budget = "Enter a valid minimum budget.";
  if ("invalid" in budgetMax) issues.budget = "Enter a valid maximum budget.";
  const budgetMinCents = budgetMin.present && "value" in budgetMin ? budgetMin.value : null;
  const budgetMaxCents = budgetMax.present && "value" in budgetMax ? budgetMax.value : null;
  if (
    (budgetMinCents !== null && budgetMinCents < 0) ||
    (budgetMaxCents !== null && budgetMaxCents < 0)
  ) {
    issues.budget = "Budgets cannot be negative.";
  }
  if (
    budgetMinCents !== null &&
    budgetMaxCents !== null &&
    budgetMinCents > budgetMaxCents
  ) {
    issues.budget = "The minimum budget cannot exceed the maximum.";
  }

  let deadlineBefore: Date | null = null;
  const rawDeadline = params.get("deadlineBefore")?.trim() ?? "";
  if (rawDeadline) {
    const parsed = new Date(rawDeadline);
    if (Number.isNaN(parsed.getTime())) {
      issues.deadlineBefore = "Enter a valid deadline.";
    } else {
      deadlineBefore = parsed;
    }
  }

  const latitude = numberParam(params, "lat");
  const longitude = numberParam(params, "lng");
  const hasLatitude = latitude.present;
  const hasLongitude = longitude.present;
  let origin: Coordinates | null = null;
  if (hasLatitude !== hasLongitude) {
    issues.origin = "Send both a latitude and a longitude.";
  } else if (hasLatitude && hasLongitude) {
    if ("invalid" in latitude || "invalid" in longitude) {
      issues.origin = "Enter valid coordinates.";
    } else if (!isCoordinates({ latitude: latitude.value, longitude: longitude.value })) {
      issues.origin = "Enter coordinates within the valid range.";
    } else {
      origin = { latitude: latitude.value, longitude: longitude.value };
    }
  }

  const radius = numberParam(params, "radiusKm");
  let radiusKm: number | null = null;
  if ("invalid" in radius) {
    issues.radiusKm = "Enter a valid radius.";
  } else if (radius.present) {
    if (radius.value < MIN_RADIUS_KM || radius.value > MAX_RADIUS_KM) {
      issues.radiusKm = `The radius must be between ${MIN_RADIUS_KM} and ${MAX_RADIUS_KM} km.`;
    } else {
      radiusKm = radius.value;
    }
  }

  const rawSort = params.get("sort")?.trim() ?? "";
  const sort = (publicTaskSorts as readonly string[]).includes(rawSort)
    ? (rawSort as PublicTaskSort)
    : "recommended";
  if (rawSort && !(publicTaskSorts as readonly string[]).includes(rawSort)) {
    issues.sort = "Choose a supported sort order.";
  }

  const pageParam = numberParam(params, "page");
  let page = 1;
  if ("invalid" in pageParam) {
    issues.page = "Enter a valid page.";
  } else if (pageParam.present) {
    if (!Number.isInteger(pageParam.value) || pageParam.value < 1) {
      issues.page = "The page must be one or greater.";
    } else {
      page = pageParam.value;
    }
  }

  const pageSizeParam = numberParam(params, "pageSize");
  let pageSize = DEFAULT_PAGE_SIZE;
  if ("invalid" in pageSizeParam) {
    issues.pageSize = "Enter a valid page size.";
  } else if (pageSizeParam.present) {
    if (
      !Number.isInteger(pageSizeParam.value) ||
      pageSizeParam.value < 1 ||
      pageSizeParam.value > MAX_PAGE_SIZE
    ) {
      issues.pageSize = `The page size must be between 1 and ${MAX_PAGE_SIZE}.`;
    } else {
      pageSize = pageSizeParam.value;
    }
  }

  if (Object.keys(issues).length > 0) return { ok: false, issues };

  return {
    ok: true,
    query: {
      filters: {
        search: rawSearch || null,
        category,
        fulfillmentMode,
        hiringMode,
        budgetMinCents,
        budgetMaxCents,
        deadlineBefore,
      },
      origin,
      radiusKm,
      sort,
      page,
      pageSize,
    },
  };
}

function includesSearch(value: string | null, search: string): boolean {
  return Boolean(value && value.toLowerCase().includes(search));
}

/** Applies the non-location filters to one public task. */
export function matchesPublicFilters(
  task: PublicTaskCandidate,
  filters: PublicTaskFilters,
): boolean {
  const search = filters.search?.trim().toLowerCase() ?? "";
  if (
    search &&
    ![task.title, task.description, task.category, task.areaLabel].some((value) =>
      includesSearch(value, search),
    )
  ) {
    return false;
  }

  if (
    filters.category &&
    (task.category ?? "").toLowerCase() !== filters.category.toLowerCase()
  ) {
    return false;
  }

  if (filters.fulfillmentMode && task.fulfillmentMode !== filters.fulfillmentMode) {
    return false;
  }

  if (filters.hiringMode && task.hiringMode !== filters.hiringMode) {
    return false;
  }

  if (filters.budgetMinCents !== null && task.budgetCents < filters.budgetMinCents) {
    return false;
  }

  if (filters.budgetMaxCents !== null && task.budgetCents > filters.budgetMaxCents) {
    return false;
  }

  if (
    filters.deadlineBefore &&
    (!task.deadline || task.deadline.getTime() > filters.deadlineBefore.getTime())
  ) {
    return false;
  }

  return true;
}
