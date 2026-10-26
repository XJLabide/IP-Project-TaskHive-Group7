import { describe, expect, it } from "vitest";
import { HOLD_WINDOW_HOURS, holdExpiresAt, isHoldExpired } from "./hold";

describe("payment hold window", () => {
  const selectedAt = new Date("2026-10-26T10:00:00.000Z");

  it("reserves the task and Tasker for 24 hours", () => {
    expect(HOLD_WINDOW_HOURS).toBe(24);
    expect(holdExpiresAt(selectedAt).toISOString()).toBe(
      "2026-10-27T10:00:00.000Z",
    );
  });

  it("reports expiry at the boundary and after it", () => {
    const expires = holdExpiresAt(selectedAt);

    expect(isHoldExpired(expires, selectedAt)).toBe(false);
    expect(isHoldExpired(expires, new Date("2026-10-27T09:59:59.000Z"))).toBe(false);
    expect(isHoldExpired(expires, new Date("2026-10-27T10:00:00.000Z"))).toBe(true);
    expect(isHoldExpired(expires, new Date("2026-10-28T00:00:00.000Z"))).toBe(true);
    expect(isHoldExpired(null, selectedAt)).toBe(false);
  });
});
