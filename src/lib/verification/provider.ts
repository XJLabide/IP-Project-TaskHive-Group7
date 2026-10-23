import type { VerificationEvent } from "./lifecycle";

/**
 * What TaskHive is willing to take from a verification provider.
 *
 * The provider keeps identity documents; the platform only ever reads a
 * decision, its reference, and an optional human-readable reason. Anything
 * else in the payload is deliberately dropped rather than parsed, so it can
 * never reach storage.
 */
export type ProviderResult =
  | { ok: true; event: VerificationEvent }
  | { ok: false; code: "invalid_provider_result"; reason: string };

const APPROVED = "approved";
const REJECTED = "rejected";

function invalid(reason: string): ProviderResult {
  return { ok: false, code: "invalid_provider_result", reason };
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseProviderResult(payload: unknown): ProviderResult {
  if (typeof payload !== "object" || payload === null) {
    return invalid("The provider result must be an object.");
  }

  const input = payload as Record<string, unknown>;
  const status = readString(input.status)?.toLowerCase() ?? null;
  const reference = readString(input.reference) ?? readString(input.providerReference);

  if (!reference) {
    return invalid("The provider result must include a reference.");
  }

  if (status === APPROVED) {
    return {
      ok: true,
      event: { type: "provider_approved", providerReference: reference },
    };
  }

  if (status === REJECTED) {
    const reason = readString(input.reason);
    if (!reason) {
      return invalid("A rejection must include a reason.");
    }

    return {
      ok: true,
      event: {
        type: "provider_rejected",
        providerReference: reference,
        reason,
      },
    };
  }

  return invalid("The provider result status must be approved or rejected.");
}
