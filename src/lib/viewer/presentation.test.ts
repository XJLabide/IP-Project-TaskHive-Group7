import { describe, expect, it } from "vitest";
import type { MarketplaceActor } from "@/lib/domain/access";
import { gateMessage, verificationSummary, viewerSnapshot } from "./presentation";

function actor(overrides: Partial<MarketplaceActor> = {}): MarketplaceActor {
  return {
    id: "user_1",
    signedIn: true,
    name: "Ana Reyes",
    emailVerified: true,
    phoneVerified: true,
    ageAttested: true,
    verification: "pending",
    appealCount: 0,
    isAdmin: false,
    ...overrides,
  };
}

describe("viewer snapshot", () => {
  it("treats a visitor as a guest with browse-only access", () => {
    const viewer = viewerSnapshot(null);

    expect(viewer.kind).toBe("guest");
    expect(viewer.displayName).toBeNull();
    expect(viewer.canPost).toBe(false);
    expect(viewer.canApply).toBe(false);
    expect(viewer.canChat).toBe(false);
    expect(viewer.denials.apply).toBe("sign_in_required");
  });

  it("marks a signed-in account with a partial profile as incomplete", () => {
    const viewer = viewerSnapshot(
      actor({ name: null, phoneVerified: false, ageAttested: false }),
    );

    expect(viewer.kind).toBe("incomplete");
    expect(viewer.missingProfileFields).toEqual(["name", "18+ attestation"]);
    expect(viewer.canApply).toBe(false);
    expect(viewer.denials.apply).toBe("profile_incomplete");
    expect(viewer.canChat).toBe(true);
  });

  it("keeps a pending-verification Tasker able to apply but not be assigned", () => {
    const viewer = viewerSnapshot(actor({ verification: "pending" }));

    expect(viewer.kind).toBe("participant");
    expect(viewer.canApply).toBe(true);
    expect(viewer.canBeAssigned).toBe(false);
    expect(viewer.denials.assign).toBe("verification_required");
    expect(viewer.verification).toBe("pending");
  });

  it("makes a rejected Tasker browse-only with one appeal available", () => {
    const viewer = viewerSnapshot(
      actor({ verification: "rejected", appealCount: 0 }),
    );

    expect(viewer.canApply).toBe(false);
    expect(viewer.denials.apply).toBe("verification_rejected");
    expect(viewer.canAppeal).toBe(true);
  });

  it("closes the appeal once it has been used", () => {
    const viewer = viewerSnapshot(
      actor({ verification: "rejected", appealCount: 1 }),
    );

    expect(viewer.canAppeal).toBe(false);
    expect(viewer.denials.appeal).toBe("appeal_already_used");
  });

  it("carries the Admin flag through", () => {
    expect(viewerSnapshot(actor({ isAdmin: true })).isAdmin).toBe(true);
    expect(viewerSnapshot(actor()).isAdmin).toBe(false);
  });
});

describe("gate messages", () => {
  it("sends a guest to sign in", () => {
    expect(gateMessage("sign_in_required")).toMatchObject({
      title: expect.any(String),
      action: { label: "Sign in", href: "/login" },
    });
  });

  it("sends an incomplete profile to the profile checklist", () => {
    expect(gateMessage("profile_incomplete").action.href).toBe("/profile");
  });

  it("points a rejected Tasker at the one-appeal section", () => {
    expect(gateMessage("verification_rejected").action.href).toBe("/profile#appeal");
  });

  it("explains that an already-used appeal is under review", () => {
    expect(gateMessage("appeal_already_used").title).toMatch(/appeal/i);
  });

  it("has copy and an action for every denial code", () => {
    for (const code of [
      "sign_in_required",
      "profile_incomplete",
      "verification_required",
      "verification_rejected",
      "appeal_already_used",
      "appeal_not_available",
      "admin_required",
    ] as const) {
      const message = gateMessage(code);
      expect(message.title.length).toBeGreaterThan(0);
      expect(message.body.length).toBeGreaterThan(0);
      expect(message.action.href.startsWith("/")).toBe(true);
    }
  });
});

describe("verification summaries", () => {
  it("invites a new Tasker to start the check", () => {
    expect(
      verificationSummary({ status: "not_started", appealCount: 0 }),
    ).toMatchObject({
      label: "Not started",
      tone: "neutral",
      action: { href: "#verification" },
      canAppeal: false,
    });
  });

  it("tells a pending Tasker they can apply but not be assigned", () => {
    const summary = verificationSummary({ status: "pending", appealCount: 0 });

    expect(summary.label).toBe("Pending verification");
    expect(summary.tone).toBe("pending");
    expect(summary.description).toMatch(/cannot be assigned/i);
    expect(summary.action).toBeNull();
  });

  it("offers the single appeal to a rejected Tasker", () => {
    const summary = verificationSummary({ status: "rejected", appealCount: 0 });

    expect(summary.label).toBe("Verification rejected");
    expect(summary.tone).toBe("negative");
    expect(summary.action).toEqual({ label: "Submit one appeal", href: "#appeal" });
    expect(summary.canAppeal).toBe(true);
  });

  it("reports an appeal that is already with Admin", () => {
    const summary = verificationSummary({ status: "rejected", appealCount: 1 });

    expect(summary.label).toBe("Appeal under review");
    expect(summary.description).toMatch(/brows/i);
    expect(summary.action).toBeNull();
    expect(summary.canAppeal).toBe(false);
  });

  it("presents a verified Tasker as assignable", () => {
    const summary = verificationSummary({ status: "verified", appealCount: 0 });

    expect(summary.label).toBe("Verified Tasker");
    expect(summary.tone).toBe("positive");
    expect(summary.description).toMatch(/assigned/i);
    expect(summary.action).toBeNull();
  });
});
