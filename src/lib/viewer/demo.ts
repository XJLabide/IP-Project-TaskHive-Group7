import type { MarketplaceActor } from "@/lib/domain/access";
import { viewerSnapshot, type ViewerSnapshot } from "./presentation";

export const previewKinds = [
  "guest",
  "incomplete",
  "pending",
  "rejected",
  "appealed",
  "verified",
  "admin",
] as const;

export type PreviewKind = (typeof previewKinds)[number];

const complete = {
  name: "Ana Reyes",
  emailVerified: true,
  phoneVerified: true,
  ageAttested: true,
} as const;

function actor(overrides: Partial<MarketplaceActor>): MarketplaceActor {
  return {
    id: "user_demo",
    signedIn: true,
    name: complete.name,
    emailVerified: complete.emailVerified,
    phoneVerified: complete.phoneVerified,
    ageAttested: complete.ageAttested,
    verification: "pending",
    appealCount: 0,
    isAdmin: false,
    ...overrides,
  };
}

const demoActors: Record<PreviewKind, MarketplaceActor | null> = {
  guest: null,
  incomplete: actor({
    name: "Ana Reyes",
    emailVerified: true,
    phoneVerified: false,
    ageAttested: false,
    verification: "not_started",
  }),
  pending: actor({ verification: "pending" }),
  rejected: actor({ verification: "rejected", appealCount: 0 }),
  appealed: actor({ verification: "rejected", appealCount: 1 }),
  verified: actor({ verification: "verified" }),
  admin: actor({ verification: "verified", isAdmin: true }),
};

/** Deterministic viewers used by the demo state switcher and the state gallery. */
export const demoViewers: Record<PreviewKind, ViewerSnapshot> = Object.fromEntries(
  previewKinds.map((kind) => [kind, viewerSnapshot(demoActors[kind])]),
) as Record<PreviewKind, ViewerSnapshot>;

export function previewViewer(
  kind: PreviewKind | null,
  fallback: ViewerSnapshot,
): ViewerSnapshot {
  return kind ? demoViewers[kind] : fallback;
}
