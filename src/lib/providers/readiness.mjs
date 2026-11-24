// @ts-check

/** A Preview production build is still a sandbox deployment.
 * @param {Record<string, string | undefined>} env
 */
export function isProductionDeployment(env = process.env) {
  return env.VERCEL_ENV === "production" ||
    (env.NODE_ENV === "production" && !["preview", "development"].includes(env.VERCEL_ENV ?? ""));
}

/** @param {Record<string, string | undefined>} env */
export function jobsReadiness(env = process.env) {
  const issues = [
    "QSTASH_TOKEN",
    "QSTASH_DESTINATION_URL",
    "QSTASH_CURRENT_SIGNING_KEY",
    "QSTASH_NEXT_SIGNING_KEY",
  ].filter((name) => !env[name]?.trim()).map((name) => `${name} is required`);
  if (env.QSTASH_DESTINATION_URL?.trim()) {
    try {
      const url = new URL(env.QSTASH_DESTINATION_URL);
      if (url.protocol !== "https:" || url.pathname !== "/api/jobs" ||
          url.username || url.password || url.search || url.hash) throw new Error();
    } catch {
      issues.push("QSTASH_DESTINATION_URL must be an HTTPS /api/jobs URL without credentials, query, or fragment");
    }
  }
  if (isProductionDeployment(env) && env.QSTASH_DELIVERY_VERIFIED !== "true") {
    issues.push("QSTASH_DELIVERY_VERIFIED must attest to a completed signed-delivery exercise");
  }
  return { ready: issues.length === 0, issues };
}

/** Readiness permits adapter use, not live checkout or provider-managed payout.
 * @param {Record<string, string | undefined>} env
 */
export function paymentsReadiness(env = process.env) {
  const provider = env.PAYMENT_PROVIDER === "stripe" ? "stripe" :
    env.PAYMENT_PROVIDER === "paymongo" ? "paymongo" :
    env.PAYMENT_PROVIDER === "maya" ? "maya" : "disabled";
  const production = isProductionDeployment(env);
  const issues = [];
  const required = provider === "stripe" ? ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] :
    provider === "paymongo" ? ["PAYMONGO_SECRET_KEY", "PAYMONGO_WEBHOOK_SECRET"] : [];
  for (const name of required) {
    if (!env[name]?.trim()) issues.push(`${name} is required`);
  }
  if (provider === "disabled") issues.push("PAYMENT_PROVIDER must select a supported provider");
  if (provider === "maya" && (production || env.MAYA_MODE !== "sandbox")) {
    issues.push("Maya is available only in a non-production sandbox");
  }
  if (production) {
    if (env.PAYMENT_SANDBOX_VERIFIED !== "true") issues.push("PAYMENT_SANDBOX_VERIFIED must attest to the completed sandbox payment exercise");
    if (env.PAYMENT_WEBHOOK_VERIFIED !== "true") issues.push("PAYMENT_WEBHOOK_VERIFIED must attest to the completed webhook exercise");
  }
  return {
    provider,
    ready: issues.length === 0,
    checkoutEnabled: issues.length === 0 && provider === "maya" && !production,
    issues,
  };
}

/** Safe to log: contains only fixed issue messages and normalized provider names.
 * @param {Record<string, string | undefined>} env
 */
export function providerReadiness(env = process.env) {
  return {
    production: isProductionDeployment(env),
    payments: paymentsReadiness(env),
    jobs: jobsReadiness(env),
  };
}
