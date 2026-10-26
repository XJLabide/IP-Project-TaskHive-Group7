import { applySearchArea, sortPublicTasks, type DiscoverableTask } from "./discovery";
import { matchesPublicFilters, type PublicTaskFilters, type PublicTaskSort } from "./discovery-query";
import { DEFAULT_RADIUS_KM, resolveSearchArea, type SearchArea } from "./location";
import type { TaskSummary } from "./types";

/** A place a Tasker can search from. The first entry is the demo saved location. */
export type SearchOrigin = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
};

export const defaultOrigin: SearchOrigin = {
  id: "saved",
  label: "My saved location (demo)",
  latitude: 14.5995,
  longitude: 120.9842,
};

export const searchOrigins: readonly SearchOrigin[] = [
  defaultOrigin,
  { id: "quezon-city", label: "Quezon City", latitude: 14.676, longitude: 121.0437 },
  { id: "makati", label: "Makati", latitude: 14.5547, longitude: 121.0244 },
  { id: "cebu-city", label: "Cebu City", latitude: 10.3157, longitude: 123.8854 },
];

export const browseRadii = [1, 3, 5, 10, 25, 50] as const;

export const DEFAULT_BROWSE_RADIUS_KM = DEFAULT_RADIUS_KM;

/** Which origin the browse UI asked for. */
export type BrowseAreaMode = "anywhere" | "saved" | "chosen";

/**
 * Resolves the browse selection into a search area. "Anywhere" stays nationwide
 * even for a signed-in Tasker with a saved location.
 */
export function browseSearchArea(input: {
  mode: BrowseAreaMode;
  origin?: SearchOrigin | null;
  saved?: SearchOrigin | null;
  radiusKm: number;
}): SearchArea {
  if (input.mode === "anywhere") {
    return resolveSearchArea({ chosen: { radiusKm: input.radiusKm } });
  }

  if (input.mode === "saved" && input.saved) {
    return resolveSearchArea({
      chosen: { radiusKm: input.radiusKm },
      saved: input.saved,
    });
  }

  const origin = input.origin ?? input.saved ?? null;
  return resolveSearchArea({
    chosen: origin ? { ...origin, radiusKm: input.radiusKm } : { radiusKm: input.radiusKm },
    saved: input.saved ?? null,
  });
}

export type BrowseSort = PublicTaskSort;

export type BrowseBudget = "any" | "under-500" | "500-1000" | "over-1000";
export type BrowseDeadline = "any" | "3-days" | "7-days" | "30-days";
export type BrowseQuick = "all" | "local" | "remote" | "bidding" | "fixed-price";

export type BrowseFilters = {
  search: string;
  category: string;
  budget: BrowseBudget;
  deadline: BrowseDeadline;
  quick: BrowseQuick;
  sort: BrowseSort;
};

export type BrowseTask = {
  task: TaskSummary;
  distanceKm: number | null;
};

export type BrowseResult = {
  tasks: BrowseTask[];
};

const php500Cents = 50_000;
const php1000Cents = 100_000;

const budgetRanges: Record<Exclude<BrowseBudget, "any">, { min?: number; max?: number }> = {
  "under-500": { max: php500Cents - 1 },
  "500-1000": { min: php500Cents, max: php1000Cents },
  "over-1000": { min: php1000Cents + 1 },
};

const deadlineDays: Record<Exclude<BrowseDeadline, "any">, number> = {
  "3-days": 3,
  "7-days": 7,
  "30-days": 30,
};

const dayMs = 24 * 60 * 60 * 1000;

function readDeadline(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toPublicFilters(filters: BrowseFilters, now: Date): PublicTaskFilters {
  const budget = filters.budget === "any" ? null : budgetRanges[filters.budget];
  const deadline =
    filters.deadline === "any"
      ? null
      : new Date(now.getTime() + deadlineDays[filters.deadline] * dayMs);

  return {
    search: filters.search.trim() || null,
    category:
      filters.category === "All categories" || filters.category === "All tasks"
        ? null
        : filters.category,
    fulfillmentMode:
      filters.quick === "local"
        ? "local"
        : filters.quick === "remote"
          ? "remote"
          : null,
    hiringMode:
      filters.quick === "bidding"
        ? "bidding"
        : filters.quick === "fixed-price"
          ? "fixed_price"
          : null,
    budgetMinCents: budget?.min ?? null,
    budgetMaxCents: budget?.max ?? null,
    deadlineBefore: deadline,
  };
}

/**
 * Adapts a demo task into the discovery shape. The demo publishes in list order,
 * so the index becomes the publication timestamp for "recommended" ordering.
 */
function toDiscoverable(task: TaskSummary, index: number, now: Date): DiscoverableTask {
  return {
    id: task.id,
    posterId: task.poster,
    posterName: task.poster,
    title: task.title,
    description: task.description,
    category: task.category || null,
    areaLabel: task.location,
    budgetCents: Math.round(task.budget * 100),
    currency: "PHP",
    deadline: readDeadline(task.deadline),
    publishedAt:
      task.status === "open" ? new Date(now.getTime() - index * 1000) : null,
    status: task.status,
    fulfillmentMode: task.fulfillmentMode,
    hiringMode: task.hiringMode,
    exactAddress: task.addressLine ?? null,
    latitude: task.latitude ?? null,
    longitude: task.longitude ?? null,
  };
}

/** The public card view: no exact address and no coordinates leave the store. */
function toPublicTask(task: TaskSummary): TaskSummary {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    category: task.category,
    fulfillmentMode: task.fulfillmentMode,
    hiringMode: task.hiringMode,
    status: task.status,
    budget: task.budget,
    location: task.location,
    deadline: task.deadline,
    poster: task.poster,
    applications: task.applications,
  };
}

/**
 * The public browse view of the demo store. It reuses the discovery radius,
 * ordering, and filter rules so the UI and the API agree.
 */
export function browsePublicTasks(
  tasks: readonly TaskSummary[],
  filters: BrowseFilters,
  area: SearchArea,
  options: { now?: Date } = {},
): BrowseResult {
  const now = options.now ?? new Date();
  const publicFilters = toPublicFilters(filters, now);
  const byId = new Map(tasks.map((task) => [task.id, task]));

  const candidates = tasks
    .filter((task) => matchesPublicFilters(
      {
        title: task.title,
        description: task.description,
        category: task.category || null,
        areaLabel: task.location,
        fulfillmentMode: task.fulfillmentMode,
        hiringMode: task.hiringMode,
        budgetCents: Math.round(task.budget * 100),
        deadline: readDeadline(task.deadline),
      },
      publicFilters,
    ))
    .map((task, index) => toDiscoverable(task, index, now));

  const ranked = sortPublicTasks(applySearchArea(candidates, area), filters.sort);

  return {
    tasks: ranked.map(({ task, distanceKm }) => ({
      task: toPublicTask(byId.get(task.id) as TaskSummary),
      distanceKm,
    })),
  };
}

/** Whole kilometres only, so the distance cannot pin an exact address. */
export function formatBrowseDistance(distanceKm: number | null): string | null {
  if (distanceKm === null) return null;
  if (distanceKm < 1) return "<1 km";
  return `${Math.round(distanceKm)} km`;
}
