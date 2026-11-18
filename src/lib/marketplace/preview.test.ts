import { describe, expect, it } from "vitest";
import { shouldUseMarketplacePreview } from "./preview";

describe("marketplace preview boundary", () => {
  it("allows explicit preview states during local development", () => {
    expect(shouldUseMarketplacePreview(true, "development")).toBe(true);
    expect(shouldUseMarketplacePreview(false, "development")).toBe(false);
  });

  it("never routes production screens through browser-local demo data", () => {
    expect(shouldUseMarketplacePreview(true, "production")).toBe(false);
  });
});
