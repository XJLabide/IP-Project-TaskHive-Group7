import { describe, expect, it } from "vitest";
import { parseProviderResult } from "./provider";

describe("verification provider boundary", () => {
  it("turns an approval into a transition event without keeping extra payload", () => {
    const result = parseProviderResult({
      status: "approved",
      reference: "vs_123",
    });

    expect(result).toEqual({
      ok: true,
      event: { type: "provider_approved", providerReference: "vs_123" },
    });
  });

  it("drops identity documents and other unknown payload fields", () => {
    const result = parseProviderResult({
      status: "rejected",
      reference: "vs_456",
      reason: "Expired document",
      documents: [{ type: "passport", number: "P1234567" }],
      idNumber: "P1234567",
      selfieUrl: "https://provider.example/selfie.jpg",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.event).toEqual({
      type: "provider_rejected",
      providerReference: "vs_456",
      reason: "Expired document",
    });
    expect(Object.keys(result.event).sort()).toEqual([
      "providerReference",
      "reason",
      "type",
    ]);
  });

  it("refuses an unknown provider status", () => {
    const result = parseProviderResult({ status: "maybe", reference: "vs_789" });

    expect(result).toEqual({
      ok: false,
      code: "invalid_provider_result",
      reason: expect.any(String),
    });
  });

  it("refuses a rejection with no reason", () => {
    const result = parseProviderResult({ status: "rejected", reference: "vs_789" });

    expect(result.ok).toBe(false);
  });
});
