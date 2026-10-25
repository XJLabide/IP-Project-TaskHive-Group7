import { NextResponse } from "next/server";
import type { TaskWriteFailure } from "./service";

/** One HTTP mapping for every task authoring failure. */
export function taskFailureResponse(failure: TaskWriteFailure) {
  if (failure.code === "validation_failed") {
    return NextResponse.json(
      {
        error: "Check the task details.",
        code: failure.code,
        errors: failure.errors,
      },
      { status: 422 },
    );
  }

  const status =
    failure.code === "not_found"
      ? 404
      : failure.code === "forbidden"
        ? 403
        : 409;

  return NextResponse.json(
    { error: failure.reason, code: failure.code },
    { status },
  );
}
