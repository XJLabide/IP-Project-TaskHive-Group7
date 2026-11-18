---
status: accepted
---

# Hold payment before activating an assignment

A Poster's selection does not hire anyone by itself. It opens a 24-hour hold: the task moves to `PENDING_PAYMENT`, the `Assignment` moves to `PENDING_PAYMENT` with `holdExpiresAt`, the selected application becomes `ACCEPTED`, every other application stays `SUBMITTED`, and new applications are blocked because the task is no longer open. The assignment becomes `ACTIVE` only when a verified provider callback reports a successful payment. If the hold expires unpaid, the task reopens, the assignment becomes `EXPIRED`, and the selected application returns to `SUBMITTED` alongside the others.

Payment is provider-neutral. `Payment` keeps one accounting row per task with the task price — or the accepted bid on a bidding task — the provisional 5% fee snapshot, the provider name, and only safe references — never card data. Each `PaymentAttempt` stores its own provider reference and durable idempotency key before the provider is called. A database constraint allows only one creating or active attempt per payment; retries of an uncertain provider request reuse that attempt and key. Providers without guaranteed idempotency also use a database claim to prevent concurrent calls, then block retries after an ambiguous result. `PaymentEvent` stores provider event ids under a unique `(provider, eventId)` constraint. A callback that arrives before its provider reference is saved remains unprocessed and is replayed after the attempt is linked. Matched event processing and payment state changes share one transaction.

The adapter boundary is `PaymentProvider` (`createCheckout`, `parseWebhook`). The fake adapter keeps local development and tests deterministic. It is disabled in production because it accepts unsigned events. Stripe and PayMongo are configured with API idempotency keys. Maya Checkout is available only as a sandbox hosted checkout in local and Vercel Preview environments; its RSA-signed webhook is verified using both Maya sandbox public keys. Maya recommends unique request references but does not document them as idempotent, so ambiguous timeouts enter `RECONCILIATION_REQUIRED` and need provider-dashboard reconciliation before another attempt is allowed. No provider is approved for live launch until the end-to-end sandbox checklist passes.

The Tasker payout is recorded at activation with `amountCents = amount - platform fee` and `platformFeeCents` snapshot. Release timing, disputes, and refunds beyond marking the payment `REFUNDED` belong to the completion and support milestones. None of this is legal escrow.

A payment captured after the hold expired, or a second attempt captured after payment has already succeeded, is recorded as `LATE` on its attempt and does not activate the assignment or create another payout; support must reconcile and refund it. A Tasker may hold or work more than one task at a time, as the SRS allows multiple active assignments.

A scheduler must call `POST /api/jobs` with `{"jobName":"assignments.expire_holds"}` (QStash in production) so unpaid holds reopen promptly; checkout also sweeps an expired hold before refusing it.
