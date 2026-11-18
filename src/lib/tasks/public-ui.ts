import type { PublicTaskSummary } from "./discovery";
import type { TaskSummary, UiTaskStatus } from "./types";

/** One UI projection for public task API data across browse and detail screens. */
export function publicTaskToSummary(
  task: PublicTaskSummary,
  options: { status?: UiTaskStatus; exactAddress?: string | null } = {},
): TaskSummary {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    category: task.category ?? "",
    fulfillmentMode: task.fulfillmentMode,
    hiringMode: task.hiringMode,
    budget: task.budgetCents / 100,
    location: task.areaLabel,
    addressLine: options.exactAddress ?? null,
    latitude: task.approximateCoordinates?.latitude ?? null,
    longitude: task.approximateCoordinates?.longitude ?? null,
    deadline: task.deadline ?? "",
    status: options.status ?? "open",
    poster: task.posterName ?? "Task Poster",
    applications: task.applicationCount,
  };
}
