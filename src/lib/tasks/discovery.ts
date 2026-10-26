import type { FulfillmentMode, HiringMode } from "./policy";
import type { TaskLifecycleStatus } from "./lifecycle";
import { distanceKm, isCoordinates, type Coordinates, type SearchArea } from "./location";
import type { PublicTaskCandidate } from "./discovery-query";
import { canViewExactAddress, type AddressAccess } from "./address-access";

/** Everything discovery needs about a task, with the exact address kept private. */
export type DiscoverableTask = PublicTaskCandidate & {
  id: string;
  posterId: string;
  posterName: string | null;
  currency: string;
  publishedAt: Date | null;
  status: TaskLifecycleStatus;
  exactAddress: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type RankedTask = {
  task: DiscoverableTask;
  distanceKm: number | null;
};

function taskOrigin(task: DiscoverableTask): Coordinates | null {
  const point = { latitude: task.latitude, longitude: task.longitude };
  return isCoordinates(point) ? point : null;
}

/**
 * Applies the local radius. Remote tasks never need a physical location, and a
 * local task without stored coordinates cannot be placed, so both stay in the
 * results without a distance.
 */
export function applySearchArea(
  tasks: readonly DiscoverableTask[],
  area: SearchArea,
): RankedTask[] {
  const ranked: RankedTask[] = [];

  for (const task of tasks) {
    if (task.fulfillmentMode === "remote" || !area.origin) {
      ranked.push({ task, distanceKm: null });
      continue;
    }

    const point = taskOrigin(task);
    if (!point) {
      ranked.push({ task, distanceKm: null });
      continue;
    }

    const distance = distanceKm(area.origin, point);
    if (distance <= area.radiusKm) ranked.push({ task, distanceKm: distance });
  }

  return ranked;
}

function compareRecommended(a: RankedTask, b: RankedTask): number {
  const publishedA = a.task.publishedAt?.getTime() ?? Number.NEGATIVE_INFINITY;
  const publishedB = b.task.publishedAt?.getTime() ?? Number.NEGATIVE_INFINITY;
  if (publishedA !== publishedB) return publishedB - publishedA;
  return a.task.id.localeCompare(b.task.id);
}

function compareDeadline(a: RankedTask, b: RankedTask): number {
  const deadlineA = a.task.deadline?.getTime() ?? Number.POSITIVE_INFINITY;
  const deadlineB = b.task.deadline?.getTime() ?? Number.POSITIVE_INFINITY;
  if (deadlineA !== deadlineB) return deadlineA - deadlineB;
  return compareRecommended(a, b);
}

/** Orders already-filtered results; every order is deterministic. */
export function sortPublicTasks(
  items: readonly RankedTask[],
  sort: "recommended" | "nearest" | "budget_asc" | "budget_desc" | "deadline",
): RankedTask[] {
  const sorted = [...items];

  if (sort === "nearest") {
    return sorted.sort((a, b) => {
      const distanceA = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const distanceB = b.distanceKm ?? Number.POSITIVE_INFINITY;
      if (distanceA !== distanceB) return distanceA - distanceB;
      return compareRecommended(a, b);
    });
  }

  if (sort === "budget_asc" || sort === "budget_desc") {
    const direction = sort === "budget_asc" ? 1 : -1;
    return sorted.sort(
      (a, b) =>
        (a.task.budgetCents - b.task.budgetCents) * direction || compareRecommended(a, b),
    );
  }

  if (sort === "deadline") return sorted.sort(compareDeadline);

  return sorted.sort(compareRecommended);
}

export type PublicTaskPage = {
  items: RankedTask[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function paginate(
  items: readonly RankedTask[],
  page: number,
  pageSize: number,
): PublicTaskPage {
  const total = items.length;
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}

export type PublicTaskSummary = {
  id: string;
  title: string;
  description: string;
  category: string | null;
  budgetCents: number;
  currency: string;
  deadline: string | null;
  publishedAt: string | null;
  fulfillmentMode: FulfillmentMode;
  hiringMode: HiringMode;
  posterName: string | null;
  areaLabel: string | null;
  /** Whole kilometres only, so the distance cannot be used to pin an address. */
  distanceKm: number | null;
};

/** The public view of a task: no exact address and no coordinates. */
export function toPublicTaskSummary(
  task: DiscoverableTask,
  distance: number | null,
): PublicTaskSummary {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    category: task.category,
    budgetCents: task.budgetCents,
    currency: task.currency,
    deadline: task.deadline?.toISOString() ?? null,
    publishedAt: task.publishedAt?.toISOString() ?? null,
    fulfillmentMode: task.fulfillmentMode,
    hiringMode: task.hiringMode,
    posterName: task.posterName,
    areaLabel: task.fulfillmentMode === "local" ? task.areaLabel : null,
    distanceKm:
      distance === null ? null : Math.max(1, Math.round(distance)),
  };
}

export type PublicTaskDetail = PublicTaskSummary & {
  exactAddress: string | null;
  addressVisible: boolean;
};

export function toPublicTaskDetail(
  task: DiscoverableTask,
  access: AddressAccess,
  distance: number | null = null,
): PublicTaskDetail {
  const addressVisible = canViewExactAddress(access);

  return {
    ...toPublicTaskSummary(task, distance),
    exactAddress: addressVisible ? task.exactAddress : null,
    addressVisible,
  };
}

/** Public detail is visible to everyone while open, and to the participants after. */
export function canViewPublicTask(
  task: Pick<DiscoverableTask, "status" | "posterId">,
  viewerId: string | null,
  assignmentTaskerId: string | null,
): boolean {
  if (task.status === "open") return true;
  if (!viewerId) return false;
  return viewerId === task.posterId || viewerId === assignmentTaskerId;
}
