import { failureResponse } from "@/lib/api/failure";
import type { SupportFailure } from "./service";

const statuses: Record<string, number> = {
  not_found: 404,
  forbidden: 403,
  not_participant: 403,
  invalid_reason: 400,
  invalid_state: 409,
  payout_missing: 409,
  not_hired: 409,
  already_open: 409,
  dispute_open: 409,
  already_resolved: 409,
  invalid_amount: 409,
};

export function supportFailureResponse(failure: SupportFailure) {
  return failureResponse(failure.reason, failure.code, statuses);
}
