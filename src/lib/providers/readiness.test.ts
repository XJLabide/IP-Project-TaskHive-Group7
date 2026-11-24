import { describe, expect, it } from "vitest";
import { providerReadiness } from "./readiness.mjs";

describe("provider readiness report", () => {
  it("reports missing production settings without exposing supplied secrets or URLs", () => {
    const report = providerReadiness({
      NODE_ENV: "production", PAYMENT_PROVIDER: "stripe",
      STRIPE_SECRET_KEY: "secret-value-must-not-appear",
      QSTASH_DESTINATION_URL: "https://username:password@example.invalid/api/jobs?secret=1",
    });
    expect(report.payments.ready).toBe(false);
    expect(report.jobs.ready).toBe(false);
    expect(report.payments.issues).toContain("STRIPE_WEBHOOK_SECRET is required");
    expect(JSON.stringify(report)).not.toMatch(/secret-value|username|password@example|secret=1/);
  });

  it.each(["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"])("keeps attested production payments disabled when %s is blank", (name) => {
    const report = providerReadiness({
      NODE_ENV: "production", PAYMENT_PROVIDER: "stripe",
      STRIPE_SECRET_KEY: "sk_live_synthetic", STRIPE_WEBHOOK_SECRET: "whsec_synthetic",
      PAYMENT_SANDBOX_VERIFIED: "true", PAYMENT_WEBHOOK_VERIFIED: "true",
      [name]: "  ",
    });
    expect(report.payments.ready).toBe(false);
    expect(report.payments.issues).toContain(`${name} is required`);
  });

  it.each(["fake", "unsupported", "do-not-echo-me"])("never enables unsupported production provider %s", (provider) => {
    const report = providerReadiness({ VERCEL_ENV: "production", PAYMENT_PROVIDER: provider, PAYMENT_SANDBOX_VERIFIED: "true", PAYMENT_WEBHOOK_VERIFIED: "true" });
    expect(report.payments).toMatchObject({ provider: "disabled", ready: false, checkoutEnabled: false });
    expect(JSON.stringify(report)).not.toContain(provider);
  });

  it("keeps live checkout disabled even when adapter verification has been attested", () => {
    const report = providerReadiness({
      VERCEL_ENV: "production", PAYMENT_PROVIDER: "stripe",
      STRIPE_SECRET_KEY: "sk_live_synthetic", STRIPE_WEBHOOK_SECRET: "whsec_synthetic",
      PAYMENT_SANDBOX_VERIFIED: "true", PAYMENT_WEBHOOK_VERIFIED: "true",
    });
    expect(report.payments).toMatchObject({ ready: true, checkoutEnabled: false });
  });

  it("allows Maya sandbox checkout for Preview builds without marking production ready", () => {
    const report = providerReadiness({ NODE_ENV: "production", VERCEL_ENV: "preview", PAYMENT_PROVIDER: "maya", MAYA_MODE: "sandbox" });
    expect(report.production).toBe(false);
    expect(report.payments).toMatchObject({ ready: true, checkoutEnabled: true });
  });

  it("refuses Maya in production and treats an unrecognized deployment environment conservatively", () => {
    const report = providerReadiness({ NODE_ENV: "production", VERCEL_ENV: "unexpected", PAYMENT_PROVIDER: "maya", MAYA_MODE: "sandbox", PAYMENT_SANDBOX_VERIFIED: "true", PAYMENT_WEBHOOK_VERIFIED: "true" });
    expect(report.production).toBe(true);
    expect(report.payments).toMatchObject({ ready: false, checkoutEnabled: false });
  });
});
