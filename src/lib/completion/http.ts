import { failureResponse } from "@/lib/api/failure";
import type { CompletionFailure, CompletionFailureCode } from "./service";

const statuses: Record<CompletionFailureCode, number> = {
  not_found: 404,
  not_tasker: 403,
  not_poster: 403,
  not_participant: 403,
  evidence_required: 409,
  invalid_state: 409,
  not_submitted: 409,
  already_submitted: 409,
  already_released: 409,
  already_disputed: 409,
  dispute_open: 409,
  not_unlocked: 409,
  already_reviewed: 409,
  invalid_rating: 400,
  invalid_comment: 400,
  invalid_reason: 400,
  payout_missing: 409,
};

export function completionFailureResponse(failure: CompletionFailure) {
  return failureResponse(failure.reason, failure.code, statuses);
}
