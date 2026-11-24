/** Report runtime configuration once per Node.js server instance. Runtime guards
 * disable only the unavailable integrations, so browsing and sign-in stay up.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { providerReadiness } = await import("./lib/providers/readiness.mjs");
    const report = providerReadiness();
    if (!report.payments.ready || !report.jobs.ready) {
      console.warn("[provider-readiness] Integrations are unavailable", report);
    } else {
      console.info("[provider-readiness] Configuration checks passed", report);
    }
  }
}
