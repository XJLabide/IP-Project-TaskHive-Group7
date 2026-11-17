# Hosted checkout sandbox verification

Production must use a configured provider; the unsigned fake provider is disabled in production. The checkout page is designed to send only a task ID to TaskHive before opening the provider's hosted checkout. A return from checkout is not payment confirmation: only a verified provider callback can activate an assignment.

Maya sandbox checkout is enabled only for local development and Vercel Preview. Production checkout remains disabled. The concurrent-checkout race in issue #59 is still unresolved, so use one checkout attempt at a time and disposable test tasks; do not treat this sandbox flow as ready for live payments.

For Maya sandbox, the shared public test key is available in Maya's Developer Hub; no business signup is needed to try the sandbox. Set `PAYMENT_PROVIDER=maya` and `MAYA_MODE=sandbox` in your local environment or Vercel Preview. The adapter uses Maya’s published shared sandbox API key and both published sandbox webhook verification keys by default; override these in an untracked env file if Maya rotates them or provides account-specific sandbox values. Use a non-production database and disposable test tasks. Register the preview HTTPS callback at `/api/payments/webhook`; local testing requires a secure webhook forwarder. Never put private keys or real payment credentials in fixtures, logs, or Git.

For Maya sandbox, verify:

1. Create a task and a pending-payment assignment as the Poster. Start checkout and confirm that the hosted URL belongs to the selected provider and no payment fields are collected by TaskHive.
2. Complete payment using only the provider's documented test method. Verify that the assignment remains pending until an authentic successful webhook is processed, then becomes active exactly once.
3. Exercise a declined payment and a cancelled checkout. Verify that neither activates the assignment, and that the Poster can see the failure or cancellation.
4. Redeliver the same successful webhook and verify that it does not activate the assignment twice or create an additional payout. Send an invalid signature and verify it is rejected.
5. Check the provider dashboard, TaskHive's payment and event records, and callback delivery logs for agreement. Exercise delayed and out-of-order callbacks before production use.

The repository tests use mocked gateway clients; they do not replace these sandbox checks. Maya documents shared sandbox keys and test cards in [About Maya Checkout](https://developers.maya.ph/reference/about-maya-checkout), the [Create Checkout API](https://developers.maya.ph/reference/createv1checkout), and [Webhook Security](https://developers.maya.ph/reference/webhook-security).
