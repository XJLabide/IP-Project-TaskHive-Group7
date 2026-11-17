# Hosted checkout sandbox verification

Production must use a configured provider; the unsigned fake provider is disabled in production. The checkout page is designed to send only a task ID to TaskHive before opening the provider's hosted checkout. A return from checkout is not payment confirmation: only a verified provider callback can activate an assignment.

Checkout creation is currently disabled until concurrent checkout attempts and unmatched callbacks are handled safely (issue #59). The hosted checkout UI and provider adapters must remain unavailable for real payments until that work and the sandbox verification below are complete.

Before enabling payments, use a dedicated provider test account, test credentials, a non-production database, and disposable test tasks. Configure the selected provider's test secret and webhook signing secret (`PAYMENT_PROVIDER` and the corresponding `STRIPE_*` or `PAYMONGO_*` variables). Configure the provider's test webhook to deliver to `/api/payments/webhook`; local testing requires a provider-supported way to forward that webhook to the app. Never put real card details or secrets in fixtures, logs, or Git.

For each provider before enabling it:

1. Create a task and a pending-payment assignment as the Poster. Start checkout and confirm that the hosted URL belongs to the selected provider and no payment fields are collected by TaskHive.
2. Complete payment using only the provider's documented test method. Verify that the assignment remains pending until an authentic successful webhook is processed, then becomes active exactly once.
3. Exercise a declined payment and a cancelled checkout. Verify that neither activates the assignment, and that the Poster can see the failure or cancellation.
4. Redeliver the same successful webhook and verify that it does not activate the assignment twice or create an additional payout. Send an invalid signature and verify it is rejected.
5. Check the provider dashboard, TaskHive's payment and event records, and callback delivery logs for agreement. Exercise delayed and out-of-order callbacks before production use.

The repository tests use mocked gateway clients; they do not replace these sandbox checks. See [Stripe's hosted Checkout documentation](https://docs.stripe.com/payments/checkout) and [PayMongo's Checkout Session reference](https://docs.paymongo.com/reference/checkout-session-resource) for the provider's current test setup.
