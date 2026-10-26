import type { TaskLifecycleStatus } from "./lifecycle";

/** Payment states that count as a successful Poster payment. */
export type PaymentState =
  | "unpaid"
  | "checkout_started"
  | "paid_pending_completion"
  | "released"
  | "refunded"
  | "disputed";

/** The lifecycle states in which an assignment is live. */
const activeAssignmentStatuses: readonly TaskLifecycleStatus[] = [
  "assigned",
  "in_progress",
  "awaiting_confirmation",
  "completed",
  "disputed",
];

const paidPaymentStates: readonly PaymentState[] = [
  "paid_pending_completion",
  "released",
  "disputed",
];

export type AddressAccess = {
  posterId: string;
  viewerId: string | null;
  assignmentTaskerId: string | null;
  taskStatus: TaskLifecycleStatus;
  paymentStatuses: readonly PaymentState[];
  hasAddress: boolean;
};

/**
 * The exact address is for the Poster and, after a successful payment on an
 * active assignment, the assigned Tasker. Everyone else sees the area only.
 */
export function canViewExactAddress(access: AddressAccess): boolean {
  if (!access.hasAddress || !access.viewerId) return false;
  if (access.viewerId === access.posterId) return true;
  if (!activeAssignmentStatuses.includes(access.taskStatus)) return false;
  if (access.assignmentTaskerId !== access.viewerId) return false;

  return access.paymentStatuses.some((status) => paidPaymentStates.includes(status));
}
