import { describe, expect, it } from "vitest";
import { validateSignup } from "./signup-validation";

const valid = {
  name: "Ana Reyes",
  email: "ana@example.com",
  phone: "+63 917 123 4567",
  password: "hunter2secret",
  confirmPassword: "hunter2secret",
  ageAttested: true,
  acceptedTerms: true,
};

describe("signup validation", () => {
  it("accepts a complete signup", () => {
    expect(validateSignup(valid)).toEqual({});
  });

  it("requires a real name and email", () => {
    expect(validateSignup({ ...valid, name: "A" }).name).toBeDefined();
    expect(validateSignup({ ...valid, email: "not-an-email" }).email).toBeDefined();
  });

  it("requires a Philippine-usable phone number", () => {
    expect(validateSignup({ ...valid, phone: "12345" }).phone).toBeDefined();
    expect(validateSignup({ ...valid, phone: "+63 917 123 4567" }).phone).toBeUndefined();
  });

  it("requires at least eight password characters", () => {
    expect(validateSignup({ ...valid, password: "short", confirmPassword: "short" }).password)
      .toBeDefined();
  });

  it("requires matching passwords", () => {
    expect(
      validateSignup({ ...valid, confirmPassword: "different-secret" }).confirmPassword,
    ).toBeDefined();
  });

  it("requires the 18+ attestation and the marketplace agreement", () => {
    expect(validateSignup({ ...valid, ageAttested: false }).ageAttested).toBeDefined();
    expect(validateSignup({ ...valid, acceptedTerms: false }).acceptedTerms).toBeDefined();
  });
});
