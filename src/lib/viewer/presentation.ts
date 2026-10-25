import {
  can,
  missingBasicProfileFields,
  type DenialCode,
  type MarketplaceActor,
  type TaskerVerificationStatus,
} from "@/lib/domain/access";

export type ViewerKind = "guest" | "incomplete" | "participant";

export type ViewerSnapshot = {
  kind: ViewerKind;
  signedIn: boolean;
  isAdmin: boolean;
  emailVerified: boolean;
  displayName: string | null;
  missingProfileFields: string[];
  canPost: boolean;
  canApply: boolean;
  canChat: boolean;
  canBeAssigned: boolean;
  canAppeal: boolean;
  verification: TaskerVerificationStatus;
  appealCount: number;
  denials: {
    post: DenialCode | null;
    apply: DenialCode | null;
    chat: DenialCode | null;
    assign: DenialCode | null;
    appeal: DenialCode | null;
  };
};

function denialCode(
  actor: MarketplaceActor | null,
  action: Parameters<typeof can>[1],
): DenialCode | null {
  const decision = can(actor, action);
  return decision.allowed ? null : decision.code;
}

/** Projects the access rules into everything the UI needs to render a viewer. */
export function viewerSnapshot(actor: MarketplaceActor | null): ViewerSnapshot {
  const signedIn = Boolean(actor?.signedIn);
  const missingProfileFields = actor ? missingBasicProfileFields(actor) : [];

  return {
    kind: !signedIn ? "guest" : missingProfileFields.length ? "incomplete" : "participant",
    signedIn,
    isAdmin: actor?.isAdmin ?? false,
    emailVerified: actor?.emailVerified ?? false,
    displayName: actor?.name?.trim() || null,
    missingProfileFields,
    canPost: denialCode(actor, "post_task") === null,
    canApply: denialCode(actor, "apply_to_task") === null,
    canChat: denialCode(actor, "chat_about_task") === null,
    canBeAssigned: denialCode(actor, "be_assigned") === null,
    canAppeal: denialCode(actor, "appeal_verification") === null,
    verification: actor?.verification ?? "not_started",
    appealCount: actor?.appealCount ?? 0,
    denials: {
      post: denialCode(actor, "post_task"),
      apply: denialCode(actor, "apply_to_task"),
      chat: denialCode(actor, "chat_about_task"),
      assign: denialCode(actor, "be_assigned"),
      appeal: denialCode(actor, "appeal_verification"),
    },
  };
}

export type GateMessage = {
  title: string;
  body: string;
  action: { label: string; href: string };
};

export type VerificationTone = "neutral" | "pending" | "positive" | "negative";

export type VerificationSummary = {
  label: string;
  tone: VerificationTone;
  description: string;
  action: { label: string; href: string } | null;
  canAppeal: boolean;
};

/**
 * The single description of a Tasker's verification state used by the profile,
 * application rows, and assignment controls.
 */
export function verificationSummary(state: {
  status: TaskerVerificationStatus;
  appealCount: number;
}): VerificationSummary {
  if (state.status === "verified") {
    return {
      label: "Verified Tasker",
      tone: "positive",
      description: "Your identity check passed, so you can be assigned to tasks.",      action: null,
      canAppeal: false,
    };
  }

  if (state.status === "pending") {
    return {
      label: "Pending verification",
      tone: "pending",
      description:
        "Your applications reach Posters marked pending verification. You cannot be assigned until the provider confirms your identity.",
      action: null,
      canAppeal: false,
    };
  }

  if (state.status === "rejected") {
    if (state.appealCount > 0) {
      return {
        label: "Appeal under review",
        tone: "pending",
        description:
          "An Admin is reviewing your one appeal. Keep browsing; bidding and assignment stay closed while you wait.",
        action: null,
        canAppeal: false,
      };
    }

    return {
      label: "Verification rejected",
      tone: "negative",
      description:
        "You are browse-only. You can submit one appeal for Admin review; if it succeeds, you must apply to tasks again.",
      action: { label: "Submit one appeal", href: "#appeal" },
      canAppeal: true,
    };
  }

  return {
    label: "Not started",
    tone: "neutral",
    description:
      "You can apply for tasks now. Complete the identity check before a Poster can assign you.",
    action: { label: "Start verification", href: "#verification" },
    canAppeal: false,
  };
}


/** One message per denial code, so every surface explains the same rule the same way. */
export function gateMessage(code: DenialCode): GateMessage {
  switch (code) {
    case "sign_in_required":
      return {
        title: "Sign in to continue",
        body: "Browsing is open to everyone. Sign in to post a task, apply for work, or message a Poster.",
        action: { label: "Sign in", href: "/login" },
      };
    case "profile_incomplete":
      return {
        title: "Finish your basic profile",
        body: "Before posting or applying, add your name, verify your email, and confirm you are 18 or older.",
        action: { label: "Complete profile", href: "/profile" },
      };
    case "verification_required":
      return {
        title: "Verify your identity to be assigned",
        body: "You can apply while the check is pending. Assignment opens once the verification provider confirms your identity.",
        action: { label: "View verification", href: "/profile#verification" },
      };
    case "verification_rejected":
      return {
        title: "Your verification was rejected",
        body: "You can still browse tasks. You may submit one appeal for Admin review; new applications stay closed until it is decided.",
        action: { label: "Appeal verification", href: "/profile#appeal" },
      };
    case "appeal_already_used":
      return {
        title: "Your one appeal is already with Admin",
        body: "You can keep browsing while an Admin reviews it. Bidding and assignment stay closed in the meantime.",
        action: { label: "View verification", href: "/profile#verification" },
      };
    case "appeal_not_available":
      return {
        title: "No appeal is open",
        body: "An appeal is only available after a rejected identity check.",
        action: { label: "View verification", href: "/profile#verification" },
      };
    case "admin_required":
      return {
        title: "Admins only",
        body: "This area is limited to TaskHive Admins.",
        action: { label: "Back to dashboard", href: "/dashboard" },
      };
  }
}
