import type { TaskerVerificationStatus } from "@/lib/domain/access";

/** Where a rejected Tasker's one Admin appeal has reached. */
export type AppealStatus = "none" | "pending" | "approved" | "denied";

export type VerificationState = {
  status: TaskerVerificationStatus;
  providerReference: string | null;
  rejectionReason: string | null;
  appealCount: number;
  appealStatus: AppealStatus;
};

export type VerificationEvent =
  | { type: "submitted" }
  | { type: "provider_approved"; providerReference: string }
  | { type: "provider_rejected"; providerReference: string; reason: string }
  | { type: "appeal_submitted"; note?: string }
  | { type: "appeal_approved"; note?: string }
  | { type: "appeal_denied"; reason: string };

export type VerificationEffect =
  | { type: "withdraw_applications" }
  | { type: "notify_posters"; reason: string }
  | { type: "notify_admins" }
  | { type: "notify_applicant"; reason: string }
  | { type: "require_fresh_applications" };

export type TransitionResult =
  | { ok: true; state: VerificationState; effects: VerificationEffect[] }
  | { ok: false; code: "invalid_transition"; reason: string };

export function initialVerificationState(): VerificationState {
  return {
    status: "not_started",
    providerReference: null,
    rejectionReason: null,
    appealCount: 0,
    appealStatus: "none",
  };
}

function reject(reason: string): TransitionResult {
  return { ok: false, code: "invalid_transition", reason };
}

export function transition(
  state: VerificationState,
  event: VerificationEvent,
): TransitionResult {
  if (event.type === "submitted") {
    if (state.status !== "not_started") {
      return reject("Verification can only be submitted once, before a decision.");
    }

    return {
      ok: true,
      state: { ...state, status: "pending" },
      effects: [],
    };
  }

  if (event.type === "provider_approved") {
    if (state.status !== "pending") {
      return reject("Only a pending verification can be approved.");
    }

    return {
      ok: true,
      state: {
        ...state,
        status: "verified",
        providerReference: event.providerReference,
        rejectionReason: null,
      },
      effects: [],
    };
  }

  if (event.type === "provider_rejected") {
    if (state.status !== "pending") {
      return reject("Only a pending verification can be rejected.");
    }

    return {
      ok: true,
      state: {
        ...state,
        status: "rejected",
        providerReference: event.providerReference,
        rejectionReason: event.reason,
      },
      effects: [
        { type: "withdraw_applications" },
        { type: "notify_posters", reason: "verification_rejected" },
      ],
    };
  }

  if (event.type === "appeal_submitted") {
    if (state.status !== "rejected") {
      return reject("Only a rejected verification can be appealed.");
    }
    if (state.appealCount > 0) {
      return reject("The one available appeal has already been used.");
    }

    return {
      ok: true,
      state: {
        ...state,
        appealCount: 1,
        appealStatus: "pending",
      },
      effects: [{ type: "notify_admins" }],
    };
  }

  if (event.type === "appeal_approved") {
    if (state.status !== "rejected" || state.appealStatus !== "pending") {
      return reject("Only a pending appeal can be approved.");
    }

    return {
      ok: true,
      state: {
        ...state,
        status: "verified",
        appealStatus: "approved",
        rejectionReason: null,
      },
      effects: [{ type: "require_fresh_applications" }],
    };
  }

  if (event.type === "appeal_denied") {
    if (state.status !== "rejected" || state.appealStatus !== "pending") {
      return reject("Only a pending appeal can be denied.");
    }

    return {
      ok: true,
      state: {
        ...state,
        status: "rejected",
        appealStatus: "denied",
      },
      effects: [{ type: "notify_applicant", reason: "appeal_denied" }],
    };
  }

  return reject("Unsupported verification event.");
}
