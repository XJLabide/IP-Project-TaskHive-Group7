import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLATFORM_FEE_RATE,
  payoutCents,
  platformFeeCents,
  platformFeeRate,
} from "./fee";

describe("platform fee", () => {
  it("deducts the provisional 5% from the Tasker payout", () => {
    expect(platformFeeCents(45000, DEFAULT_PLATFORM_FEE_RATE)).toBe(2250);
    expect(payoutCents(45000, DEFAULT_PLATFORM_FEE_RATE)).toBe(42750);
  });

  it("rounds to the nearest centavo and handles small amounts", () => {
    expect(platformFeeCents(999, 0.05)).toBe(50);
    expect(platformFeeCents(1, 0.05)).toBe(0);
    expect(platformFeeCents(0, 0.05)).toBe(0);
  });

  it("accepts a configured rate and falls back on invalid values", () => {
    expect(platformFeeCents(100000, 0.1)).toBe(10000);
    expect(platformFeeRate("0.08")).toBe(0.08);
    expect(platformFeeRate("2")).toBe(DEFAULT_PLATFORM_FEE_RATE);
    expect(platformFeeRate("nonsense")).toBe(DEFAULT_PLATFORM_FEE_RATE);
    expect(platformFeeRate(undefined)).toBe(DEFAULT_PLATFORM_FEE_RATE);
  });
});
