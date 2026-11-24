# Provider readiness and release checks

Issue #67 separates configuration readiness from evidence that an integration
works. Configuration checks cannot establish payment-provider eligibility,
validate credentials with a vendor, or prove a live webhook was delivered.

Production checkout remains unavailable under the existing sandbox-only release
policy. Completing these checks does not approve a payment provider for launch or
add provider-managed payout capability.

## Deployment and startup

Run `pnpm providers:check` in the deployment's exported environment before
enabling integrations. It does not load `.env` files or contact vendors. It
prints a redacted JSON report and exits 1 if either real integration is not
ready, or 0 when both pass. The report distinguishes payment adapter `ready`
from `checkoutEnabled`; production checkout stays false even when adapter
checks pass. Development's fake adapter is not evidence of real readiness.

Next.js `src/instrumentation.ts` also checks the runtime environment once per
Node.js server instance. It logs a warning for unavailable integrations without
preventing browsing or sign-in. Runtime guards enforce the same policy on every
mutation even if deployment checks were omitted. A deliberately disabled
integration therefore yields a failed readiness command and a startup warning;
the normal build and server can still run with that integration disabled.

| Integration | Configuration | Production evidence attestations |
| --- | --- | --- |
| Stripe adapter | `PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | `PAYMENT_SANDBOX_VERIFIED=true`, `PAYMENT_WEBHOOK_VERIFIED=true` |
| PayMongo adapter | `PAYMENT_PROVIDER=paymongo`, `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET` | Same payment attestations |
| Maya sandbox | `PAYMENT_PROVIDER=maya`, `MAYA_MODE=sandbox`; existing shared sandbox keys or explicit overrides | Available only outside production |
| QStash | `QSTASH_TOKEN`, `QSTASH_DESTINATION_URL`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` | `QSTASH_DELIVERY_VERIFIED=true` |

Required values must be nonblank. QStash's destination must be HTTPS with path
`/api/jobs`, without URL credentials, query parameters, or fragments, and match
the receiver used to verify signatures. These checks do not prove credentials
are accepted by vendors. They also do not validate email-provider readiness.

Both `VERCEL_ENV=production` and a self-hosted `NODE_ENV=production` use the
production evidence gates. Explicit Vercel Preview/development builds allow
sandbox exercises without those attestations. An unknown deployment environment
with `NODE_ENV=production` is treated as production. Unsigned fake payments
remain disabled in production builds, including Preview builds.

Production payment callbacks return 503 until payment readiness passes; otherwise
signature verification still applies. Checkout remains restricted to Maya
sandbox. Job publishing and schedule provisioning refuse unready configuration
before calling QStash; `/api/jobs` returns 503 before dispatch, even for a valid
signature. Read-only schedule monitoring remains available with its existing
transport configuration so operators can inspect and recover schedules.

## Payment evidence

Use a separate Preview deployment and disposable database to complete
[the hosted checkout exercise](PAYMENT_SANDBOX.md). Record the deployment,
provider/account and mode, date, responsible operator, and sanitized provider
event/attempt references in the release record. Do not include keys, signatures,
card details, or identity documents.

Verify successful, declined, cancelled, duplicate, delayed, and invalid-signature
events; confirm that only verified successful payment activates an assignment
and that duplicates do not create another payout. Retain the evidence before
setting production verification attestations. Clear those attestations when
changing provider/account, webhook credentials, or the relevant integration.
The attestations are explicit operator declarations, not a cryptographic or
automated proof. Enable them only for the provider/account and deployment
configuration that the release evidence actually covers. Never reuse an
attestation from another provider or environment.

## QStash evidence

Use Preview to complete [the signed jobs exercise](scheduled-jobs-verification.md).
Verify signed delivery to the exact destination, rejection of invalid signatures,
one successful idempotent job run and retry, and schedule/backlog monitoring.
Record the deployment, destination, date, operator, message IDs, and observed
outcomes without tokens or signing keys. Repeat after changing the destination,
signing keys, account, or job handling before re-enabling production delivery.

Runtime readiness is fail-closed. Existing schedules are not automatically paused
or deleted: when a receiving endpoint is disabled, QStash may retry and accumulate
failed deliveries. Pause schedules in QStash during rollout or rollback and
inspect the failure queue before resuming. Disabling jobs can delay hold expiry,
completion reminders, automatic release, review publication, and email delivery;
it must remain visible to operators.

## Verification limits

Automated checks use synthetic configuration and mocked external SDKs; they do
not attest to production configuration or live sandbox completion. Never mark a
check passed solely because a unit test passed or a key is present. Startup and
deployment checks must print only safe readiness facts and missing-variable
names, never environment values, raw provider errors, or destination URLs.

## Implementation verification

The new regressions first reproduced publishing without signing keys, adapter
selection without production verification, production provisioning without
delivery verification, and dispatch of signed jobs before readiness passed.
The completed change passed 86 focused tests and all 538 regular tests, plus
typechecking, ESLint, Prisma validation, and the production build. Local checks
used Node 24.9.0; pnpm reports the project's Node 22.x engine requirement, and CI
uses Node 22.x.

A local `next start` production instance with integrations disabled emitted the
redacted startup report. Requests to `/api/jobs` and `/api/payments/webhook`
returned 503. No production settings, real payment credentials, live vendor
calls, or production deployments were used or verified.
