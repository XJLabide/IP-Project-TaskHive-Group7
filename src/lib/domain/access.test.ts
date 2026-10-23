import { describe, expect, it } from "vitest";
import { can, type AccessDecision, type MarketplaceActor } from "./access";

function denial(decision: AccessDecision) {
  if (decision.allowed) throw new Error("Expected the action to be denied.");
  return decision;
}

const completeProfile = {
  name: "Ana Reyes",
  emailVerified: true,
  phoneVerified: true,
  ageAttested: true,
};

function actor(overrides: Partial<MarketplaceActor> = {}): MarketplaceActor {
  return {
    id: "user_1",
    signedIn: true,
    ...completeProfile,
    verification: "pending",
    appealCount: 0,
    isAdmin: false,
    ...overrides,
  };
}

describe("marketplace access gates", () => {
  it("lets a guest browse public tasks but blocks every marketplace action", () => {
    expect(can(null, "browse_tasks")).toEqual({ allowed: true });

    for (const action of [
      "post_task",
      "apply_to_task",
      "chat_about_task",
      "view_private_account",
    ] as const) {
      expect(can(null, action)).toEqual({
        allowed: false,
        code: "sign_in_required",
        reason: expect.any(String),
      });
    }
  });

  it("blocks posting and applying until the basic profile is complete", () => {
    expect(can(actor({ phoneVerified: false }), "post_task")).toEqual({
      allowed: false,
      code: "profile_incomplete",
      reason: expect.stringContaining("phone"),
    });
    expect(denial(can(actor({ name: null }), "post_task")).code).toBe("profile_incomplete");
    expect(denial(can(actor({ emailVerified: false }), "apply_to_task")).code).toBe(
      "profile_incomplete",
    );
    expect(denial(can(actor({ ageAttested: false }), "apply_to_task")).code).toBe(
      "profile_incomplete",
    );

    expect(can(actor(), "post_task")).toEqual({ allowed: true });
    expect(can(actor(), "apply_to_task")).toEqual({ allowed: true });
  });

  it("lets a pending-verification Tasker apply but not be assigned", () => {
    const pending = actor({ verification: "pending" });

    expect(can(pending, "apply_to_task")).toEqual({ allowed: true });
    expect(can(pending, "be_assigned")).toEqual({
      allowed: false,
      code: "verification_required",
      reason: expect.any(String),
    });

    expect(can(actor({ verification: "verified" }), "be_assigned")).toEqual({
      allowed: true,
    });
  });

  it("makes a rejected Tasker browse-only", () => {
    const rejected = actor({ verification: "rejected" });

    expect(can(rejected, "browse_tasks")).toEqual({ allowed: true });
    expect(can(rejected, "apply_to_task")).toEqual({
      allowed: false,
      code: "verification_rejected",
      reason: expect.any(String),
    });
    expect(denial(can(rejected, "be_assigned")).code).toBe("verification_rejected");
  });

  it("lets a Tasker apply before they have started the stronger identity check", () => {
    expect(can(actor({ verification: "not_started" }), "apply_to_task")).toEqual({
      allowed: true,
    });
  });

  it("allows exactly one Admin appeal after rejection", () => {
    expect(
      can(actor({ verification: "rejected", appealCount: 0 }), "appeal_verification"),
    ).toEqual({ allowed: true });

    expect(
      can(actor({ verification: "rejected", appealCount: 1 }), "appeal_verification"),
    ).toEqual({
      allowed: false,
      code: "appeal_already_used",
      reason: expect.any(String),
    });

    expect(
      denial(
        can(actor({ verification: "pending", appealCount: 0 }), "appeal_verification"),
      ).code,
    ).toBe("appeal_not_available");
  });

  it("restricts verification appeal decisions to Admins", () => {
    expect(can(actor(), "review_verification_appeal")).toEqual({
      allowed: false,
      code: "admin_required",
      reason: expect.any(String),
    });
    expect(can(actor({ isAdmin: true }), "review_verification_appeal")).toEqual({
      allowed: true,
    });
  });

  it("lets any signed-in user chat and see their account without the basic profile", () => {
    const incomplete = actor({
      name: null,
      emailVerified: false,
      phoneVerified: false,
      ageAttested: false,
      verification: "not_started",
    });

    expect(can(incomplete, "chat_about_task")).toEqual({ allowed: true });
    expect(can(incomplete, "view_private_account")).toEqual({ allowed: true });
  });
});
