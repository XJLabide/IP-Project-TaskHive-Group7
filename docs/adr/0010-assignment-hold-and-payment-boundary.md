---
status: accepted
---

# Hold payment before activating an assignment

A Poster's selection does not hire anyone by itself. It opens a 24-hour hold: the task moves to `PENDING_PAYMENT`, the `Assignment` moves to `PENDING_PAYMENT` with `holdExpiresAt`, the selected application becomes `ACCEPTED`, every other application stays `SUBMITTED`, and new applications are blocked because the task is no longer open. The assignment becomes `ACTIVE` only when a verified provider callback reports a successful payment. If the hold expires unpaid, the task reopens, the assignment becomes `EXPIRED`, and the selected application returns to `SUBMITTED` alongside the others.

Payment is provider-neutral. `Payment` keeps one accounting row per task with the task price — or the accepted bid on a bidding task — the provisional 5% fee snapshot, the provider name, and only safe references — never card data. Each checkout retry increments `attemptCount` and replaces the provider session reference on the same row. `PaymentEvent` stores provider event ids under a unique `(provider, eventId)` constraint, and the event row and state change share one transaction, so a retried callback cannot double-charge, double-activate, or create a second payout.

The adapter boundary is `PaymentProvider` (`createCheckout`, `parseWebhook`). The fake adapter keeps local development and tests deterministic. It is disabled in production unless `ALLOW_FAKE_PAYMENTS=1`, because it accepts unsigned events. PayMongo is the first provider to evaluate, not an approved selection; the PayMongo adapter verifies the `Paymongo-Signature` HMAC and must be checked against sandbox before enabling.

The Tasker payout is recorded at activation with `amountCents = amount - platform fee` and `platformFeeCents` snapshot. Release timing, disputes, and refunds beyond marking the payment `REFUNDED` belong to the completion and support milestones. None of this is legal escrow.

A payment captured after the hold expired is recorded as paid but does not activate the assignment or create a payout; support must refund it. A Tasker may hold or work more than one task at a time, as the SRS allows multiple active assignments.

A scheduler must call `POST /api/jobs` with `{"jobName":"assignments.expire_holds"}` (QStash in production) so unpaid holds reopen promptly; checkout also sweeps an expired hold before refusing it.
