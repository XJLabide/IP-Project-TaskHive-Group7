import { failureResponse } from "@/lib/api/failure";
import type { ChatFailure } from "./service";

const statuses: Record<string, number> = {
  not_found: 404,
  forbidden: 403,
  own_task: 403,
  not_participant: 403,
};

/** One HTTP mapping for every chat failure. */
export function chatFailureResponse(failure: ChatFailure) {
  return failureResponse(failure.reason, failure.code, statuses);
}
