import { describe, expect, it } from "vitest";
import {
  categoriesFor,
  categoryForFulfillment,
  findLaunchCategory,
  isExcludedCategory,
  normalizeCategoryName,
} from "./policy";

describe("launch category policy", () => {
  it("allows every approved local category", () => {
    for (const name of ["Errands", "Delivery", "Cleaning", "Repairs", "Moving", "Tutoring"]) {
      expect(categoryForFulfillment(name, "local")).toMatchObject({ allowed: true });
    }
  });

  it("allows every approved remote category", () => {
    for (const name of ["Tutoring", "Writing", "Design", "Translation"]) {
      expect(categoryForFulfillment(name, "remote")).toMatchObject({ allowed: true });
    }
  });

  it("treats tutoring as both local and remote", () => {
    expect(categoryForFulfillment("Tutoring", "local")).toMatchObject({ allowed: true });
    expect(categoryForFulfillment("Tutoring", "remote")).toMatchObject({ allowed: true });
  });

  it("rejects an approved category used with the wrong fulfillment", () => {
    expect(categoryForFulfillment("Writing", "local")).toMatchObject({
      allowed: false,
      code: "fulfillment_mismatch",
    });
    expect(categoryForFulfillment("Moving", "remote")).toMatchObject({
      allowed: false,
      code: "fulfillment_mismatch",
    });
  });

  it("rejects excluded high-risk categories with a safety reason", () => {
    for (const name of [
      "Medical",
      "Childcare",
      "Child care",
      "Passenger transport",
      "Hazardous waste removal",
    ]) {
      const result = categoryForFulfillment(name, "local");
      expect(result).toMatchObject({ allowed: false, code: "excluded_category" });
      if (!result.allowed) expect(result.reason).toMatch(/not available at launch/i);
    }
  });

  it("rejects categories that are not on the launch list", () => {
    expect(categoryForFulfillment("Pet grooming", "local")).toMatchObject({
      allowed: false,
      code: "unknown_category",
    });
  });

  it("matches category names without case, spaces, or punctuation", () => {
    expect(normalizeCategoryName("  Child-Care ")).toBe("child care");
    expect(findLaunchCategory("  writing ")?.slug).toBe("writing");
    expect(findLaunchCategory("not-a-category")).toBeNull();
    expect(isExcludedCategory("Passenger-Transport")).toBe(true);
  });

  it("lists only the categories valid for each fulfillment", () => {
    expect(categoriesFor("local").map((category) => category.label).sort()).toEqual([
      "Cleaning",
      "Delivery",
      "Errands",
      "Moving",
      "Repairs",
      "Tutoring",
    ]);
    expect(categoriesFor("remote").map((category) => category.label).sort()).toEqual([
      "Design",
      "Translation",
      "Tutoring",
      "Writing",
    ]);
  });
});
