import { afterEach, describe, expect, it, vi } from "vitest";
import { isAllowedSessionOrigin } from "./session-origin";

afterEach(() => vi.unstubAllEnvs());

describe("isAllowedSessionOrigin", () => {
  it("accepts the configured production origin", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://taskhiveplatform.vercel.app");

    expect(
      isAllowedSessionOrigin(
        new Request("https://taskhiveplatform.vercel.app/api/auth/session", {
          method: "POST",
          headers: { origin: "https://taskhiveplatform.vercel.app" },
        }),
      ),
    ).toBe(true);
  });

  it("accepts the current Vercel preview origin", () => {
    vi.stubEnv("VERCEL_URL", "taskhive-preview-123.vercel.app");

    expect(
      isAllowedSessionOrigin(
        new Request("https://taskhive-preview-123.vercel.app/api/auth/session", {
          method: "POST",
          headers: { origin: "https://taskhive-preview-123.vercel.app" },
        }),
      ),
    ).toBe(true);
  });

  it("rejects missing and untrusted origins", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://taskhiveplatform.vercel.app");

    expect(isAllowedSessionOrigin(new Request("https://taskhiveplatform.vercel.app/api/auth/session"))).toBe(false);
    expect(
      isAllowedSessionOrigin(
        new Request("https://taskhiveplatform.vercel.app/api/auth/session", {
          method: "POST",
          headers: { origin: "https://attacker.example" },
        }),
      ),
    ).toBe(false);
  });
});
