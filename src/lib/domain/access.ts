/** Tasker identity-verification lifecycle state, as held by the platform. */
export type TaskerVerificationStatus =
  | "not_started"
  | "pending"
  | "verified"
  | "rejected";

/** Everything the access rules need to know about the person acting. */
export type MarketplaceActor = {
  id: string;
  signedIn: boolean;
  name: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  ageAttested: boolean;
  verification: TaskerVerificationStatus;
  appealCount: number;
  isAdmin: boolean;
};

export type MarketplaceAction =
  | "browse_tasks"
  | "post_task"
  | "apply_to_task"
  | "chat_about_task"
  | "view_private_account"
  | "start_verification"
  | "be_assigned"
  | "appeal_verification"
  | "review_verification_appeal";

export type DenialCode =
  | "sign_in_required"
  | "profile_incomplete"
  | "verification_required"
  | "verification_rejected"
  | "appeal_already_used"
  | "appeal_not_available"
  | "admin_required";

export type AccessDecision =
  | { allowed: true }
  | { allowed: false; code: DenialCode; reason: string };

const ALLOWED: AccessDecision = { allowed: true };

function deny(code: DenialCode, reason: string): AccessDecision {
  return { allowed: false, code, reason };
}

export function can(
  actor: MarketplaceActor | null,
  action: MarketplaceAction,
): AccessDecision {
  if (action === "browse_tasks") return ALLOWED;

  if (!actor?.signedIn) {
    return deny("sign_in_required", "Sign in to take part in the marketplace.");
  }

  if (action === "post_task" || action === "apply_to_task") {
    const missing = missingBasicProfileFields(actor);
    if (missing.length > 0) {
      return deny(
        "profile_incomplete",
        `Complete your basic profile first: ${missing.join(", ")}.`,
      );
    }
  }

  if (action === "be_assigned") {
    if (actor.verification === "rejected") {
      return deny(
        "verification_rejected",
        "Your identity verification was rejected, so you cannot be assigned tasks.",
      );
    }
    if (actor.verification !== "verified") {
      return deny(
        "verification_required",
        "Complete identity verification before you can be assigned a task.",
      );
    }
  }

  if (action === "apply_to_task" && actor.verification === "rejected") {
    return deny(
      "verification_rejected",
      "Your identity verification was rejected. You may submit one appeal for Admin review.",
    );
  }

  if (action === "review_verification_appeal" && !actor.isAdmin) {
    return deny("admin_required", "Admin access is required.");
  }

  if (action === "appeal_verification") return appealDecision(actor);

  return ALLOWED;
}

function appealDecision(actor: MarketplaceActor): AccessDecision {
  if (actor.verification !== "rejected") {
    return deny(
      "appeal_not_available",
      "An appeal is only available after a rejected identity verification.",
    );
  }
  if (actor.appealCount > 0) {
    return deny(
      "appeal_already_used",
      "You have already used your one verification appeal.",
    );
  }
  return ALLOWED;
}

/** The basic-profile requirements a participant has not met yet, in product order. */
export function missingBasicProfileFields(actor: MarketplaceActor): string[] {
  const missing: string[] = [];
  if (!actor.name?.trim()) missing.push("name");
  if (!actor.emailVerified) missing.push("verified email");
  if (!actor.phoneVerified) missing.push("verified phone");
  if (!actor.ageAttested) missing.push("18+ attestation");
  return missing;
}
