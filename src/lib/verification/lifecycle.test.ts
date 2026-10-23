import { describe, expect, it } from "vitest";
import {
  initialVerificationState,
  transition,
  type VerificationState,
} from "./lifecycle";

function state(overrides: Partial<VerificationState> = {}): VerificationState {
  return { ...initialVerificationState(), ...overrides };
}

describe("Tasker verification lifecycle", () => {
  it("moves a new Tasker into pending when they submit for verification", () => {
    const result = transition(initialVerificationState(), { type: "submitted" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status).toBe("pending");
    expect(result.effects).toEqual([]);
  });

  it("does not let a rejected Tasker resubmit instead of appealing", () => {
    const result = transition(
      state({ status: "rejected", appealCount: 0 }),
      { type: "submitted" },
    );

    expect(result.ok).toBe(false);
  });

  it("verifies a pending Tasker when the provider approves", () => {
    const result = transition(
      state({ status: "pending" }),
      { type: "provider_approved", providerReference: "vs_123" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status).toBe("verified");
    expect(result.state.providerReference).toBe("vs_123");
    expect(result.effects).toEqual([]);
  });

  it("rejects a pending Tasker, withdrawing applications and notifying Posters", () => {
    const result = transition(
      state({ status: "pending" }),
      {
        type: "provider_rejected",
        providerReference: "vs_456",
        reason: "Document did not match",
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status).toBe("rejected");
    expect(result.state.rejectionReason).toBe("Document did not match");
    expect(result.effects).toEqual([
      { type: "withdraw_applications" },
      { type: "notify_posters", reason: "verification_rejected" },
    ]);
  });

  it("refuses to re-decide a verification that is already resolved", () => {
    const result = transition(
      state({ status: "verified" }),
      { type: "provider_rejected", providerReference: "vs_789", reason: "late" },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("invalid_transition");
  });

  it("records one Admin appeal from a rejected Tasker while keeping them browse-only", () => {
    const result = transition(
      state({ status: "rejected", rejectionReason: "Blurry document", appealCount: 0 }),
      { type: "appeal_submitted", note: "The second photo was clearer." },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status).toBe("rejected");
    expect(result.state.appealCount).toBe(1);
    expect(result.state.appealStatus).toBe("pending");
    expect(result.effects).toEqual([{ type: "notify_admins" }]);
  });

  it("refuses a second appeal", () => {
    const result = transition(
      state({ status: "rejected", appealCount: 1, appealStatus: "denied" }),
      { type: "appeal_submitted" },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("invalid_transition");
  });

  it("verifies after a successful appeal and requires fresh applications", () => {
    const result = transition(
      state({ status: "rejected", appealCount: 1, appealStatus: "pending" }),
      { type: "appeal_approved" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status).toBe("verified");
    expect(result.state.appealStatus).toBe("approved");
    expect(result.effects).toEqual([{ type: "require_fresh_applications" }]);
  });

  it("keeps a denied appeal browse-only with no further appeal", () => {
    const result = transition(
      state({
        status: "rejected",
        rejectionReason: "Blurry document",
        appealCount: 1,
        appealStatus: "pending",
      }),
      { type: "appeal_denied", reason: "Evidence still insufficient" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.status).toBe("rejected");
    expect(result.state.appealStatus).toBe("denied");
    expect(result.state.appealCount).toBe(1);
    expect(result.state.rejectionReason).toBe("Blurry document");
    expect(result.effects).toEqual([
      { type: "notify_applicant", reason: "appeal_denied" },
    ]);
  });
});
