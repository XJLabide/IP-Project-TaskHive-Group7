import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const script = fileURLToPath(new URL("../../../scripts/check-provider-config.mjs", import.meta.url));

it("fails deployment checks with safe, actionable diagnostics when production configuration is incomplete", () => {
  const result = spawnSync(process.execPath, [script], {
    env: { NODE_ENV: "production", PAYMENT_PROVIDER: "stripe", STRIPE_SECRET_KEY: "do-not-log-this-secret" },
    encoding: "utf8",
  });
  expect(result.status).toBe(1);
  expect(result.stdout).toContain("STRIPE_WEBHOOK_SECRET");
  expect(result.stdout).toContain("QSTASH_CURRENT_SIGNING_KEY");
  expect(result.stdout + result.stderr).not.toContain("do-not-log-this-secret");
});

it("passes for complete attested production configuration while still reporting checkout disabled", () => {
  const result = spawnSync(process.execPath, [script], {
    env: {
      NODE_ENV: "production", PAYMENT_PROVIDER: "stripe",
      STRIPE_SECRET_KEY: "sk_live_synthetic", STRIPE_WEBHOOK_SECRET: "whsec_synthetic",
      PAYMENT_SANDBOX_VERIFIED: "true", PAYMENT_WEBHOOK_VERIFIED: "true",
      QSTASH_TOKEN: "synthetic-token", QSTASH_CURRENT_SIGNING_KEY: "synthetic-current", QSTASH_NEXT_SIGNING_KEY: "synthetic-next",
      QSTASH_DESTINATION_URL: "https://taskhive.example/api/jobs", QSTASH_DELIVERY_VERIFIED: "true",
    },
    encoding: "utf8",
  });
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({ production: true, payments: { ready: true, checkoutEnabled: false }, jobs: { ready: true } });
  expect(result.stdout + result.stderr).not.toMatch(/sk_live_synthetic|whsec_synthetic|synthetic-token|synthetic-current|synthetic-next|https:\/\//);
});
