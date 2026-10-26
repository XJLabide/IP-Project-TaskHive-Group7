import { failureResponse } from "@/lib/api/failure";
import type { ApplicationFailure } from "./service";

const statuses: Record<string, number> = {
  not_found: 404,
  forbidden: 403,
  own_task: 403,
  verification_rejected: 403,
  wrong_hiring_mode: 422,
};

/** One HTTP mapping for every application failure. */
export function applicationFailureResponse(failure: ApplicationFailure) {
  return failureResponse(failure.reason, failure.code, statuses);
}
