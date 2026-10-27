import type { FulfillmentMode, HiringMode } from "./policy";
import type { TaskFieldErrors } from "./validation";

/** The authoring states the mock UI can show. */
export type UiTaskStatus =
  | "draft"
  | "open"
  | "pending_payment"
  | "assigned"
  | "awaiting_confirmation"
  | "completed"
  | "cancellation_review"
  | "disputed"
  | "cancelled";

/** The fields shared by a task and the edit form. */
export type TaskFormSource = {
  title: string;
  description: string;
  category: string;
  fulfillmentMode: FulfillmentMode;
  hiringMode: HiringMode;
  budget: number;
  location: string | null;
  /** Approximate coordinates for local discovery; never shown on a card. */
  latitude?: number | null;
  longitude?: number | null;
  /** Exact service address; private until payment succeeds on an active assignment. */
  addressLine?: string | null;
  deadline: string;
};

export type TaskSummary = TaskFormSource & {
  id: string;
  status: UiTaskStatus;
  poster: string;
  applications: number;
};

export type TaskWriteResult =
  | {
      ok: true;
      taskId: string;
      status: UiTaskStatus | null;
      clearedApplications?: number;
    }
  | { ok: false; errors?: TaskFieldErrors; reason?: string };
