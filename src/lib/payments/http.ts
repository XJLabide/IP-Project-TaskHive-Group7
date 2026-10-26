import { failureResponse } from "@/lib/api/failure";
import type { PaymentFailure } from "./service";

const statuses: Record<string, number> = {
  not_found: 404,
  application_not_found: 404,
  forbidden: 403,
  task_not_open: 409,
  not_eligible: 409,
  hold_expired: 409,
  already_paid: 409,
  provider_error: 502,
  invalid_event: 400,
};

export function paymentFailureResponse(failure: PaymentFailure) {
  return failureResponse(failure.reason, failure.code, statuses);
}
