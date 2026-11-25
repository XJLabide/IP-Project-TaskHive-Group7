import { providerReadiness } from "../src/lib/providers/readiness.mjs";

// Use the deployment's explicit environment, never auto-load local credentials
// or contact vendors. The report contains no environment values.
const report = providerReadiness();
console.log(JSON.stringify(report, null, 2));
if (!report.payments.ready || !report.jobs.ready) process.exitCode = 1;
