# Stripe refund correlation and sandbox verification

Issue: [#61](https://github.com/XJLabide/IP-Project-TaskHive-Group7/issues/61).

## Operational behavior

Apply migration `20261120150000_correlate_stripe_refunds` before deploying the
updated application, then generate the Prisma client. Nullable provider object IDs
are stored on each durable PaymentAttempt and PaymentEvent. Checkout callbacks
bind Payment Intent IDs; expanded intents also bind Charge IDs. Refund callbacks
can match either ID, scoped to the provider. No raw webhook bodies, card details,
or new credentials are persisted. Unique provider/ID indexes prevent an object
being attached to two attempts.

Stripe's [charge.refunded event](https://docs.stripe.com/api/events/types)
includes partial refunds; [amount_refunded](https://docs.stripe.com/api/charges/object)
is the cumulative refunded total. We store the increasing total, never add it as
an event delta. Duplicates and stale totals cannot double-count or undo a refund.
A full refund sets Payment and PaymentAttempt to REFUNDED. A partial refund sets
Payment to DISPUTED, records refundedCents/refundedAt, and leaves the attempt's
capture status intact. This uses the existing review state to stop completion
and automatic payout from releasing the original full amount. Support must reconcile
the remaining funds outside the normal resolution flow: case resolution returns
invalid_state while refundedCents is nonzero, and a conditional payment update
rolls back a resolution if a provider refund races it; this change does not initiate transfers, reverse a released
payout, or create a support case. Already released funds require provider-side
reconciliation.

Unknown references, invalid totals, and refunds received before local capture
remain unprocessed with outcome `pending_reconciliation`. Checkout callbacks
replay pending events using all known IDs after committing the capture. A crash
between commit and replay is recoverable by redelivering the checkout event.
Monitor PaymentEvent rows with processedAt NULL; an HTTP 200 acknowledges durable
receipt and does not mean the refund has been applied. Charge-only callbacks
without a previously bound Charge ID require reconciliation, rather than guessing
from amount, task, or customer information.

Existing attempts have no new IDs after migration. Redeliver the original signed
checkout completion event to bind its payment_intent and replay pending refunds,
even if that completion event was already processed. For historical refund
callbacks that the previous code marked processed without applying, verify the
provider refund and local accounting, then clear only that event's processedAt
under an audited maintenance procedure and redeliver it. Never reset payment or
attempt status just to force a replay.

## Automated boundary coverage

Run `pnpm exec vitest run src/lib/payments/stripe-refunds.test.ts`.
The tests use the real Stripe SDK signature verification and native snapshot
payload shapes, with stateful in-memory persistence. They cover normal and
expanded IDs, Charge-only lookup, cumulative partial/full refunds, duplicate and
out-of-order deliveries, early refunds, invalid totals, and provider isolation.
The existing webhook route tests cover invalid signatures. These tests do not
claim to replace a PostgreSQL transaction or an actual Stripe sandbox run.

## Real sandbox exercise

Use a dedicated test database and Stripe sandbox account. Never use live keys.
The development environment used for this change has no Stripe CLI or configured
Stripe test secret, so the exercise below has **not** been run here.

1. Apply migrations to the test database. Configure PAYMENT_PROVIDER=stripe and
   STRIPE_SECRET_KEY with the sandbox secret. Run
   `stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,charge.refunded --forward-to localhost:3000/api/payments/webhook`.
   Set STRIPE_WEBHOOK_SECRET to the listener's signing secret and start the app.
2. Hire a Tasker and pay through TaskHive's actual Checkout link with Stripe's
   successful test card. Record the resulting `cs_…`, `pi_…`, PaymentAttempt ID,
   and original amount. Verify the attempt stores providerPaymentIntentId and the
   Payment is PAID_PENDING_COMPLETION. Do not use an unrelated `stripe trigger`
   fixture: its payment has no TaskHive checkout attempt.
3. In Stripe's sandbox Dashboard, refund a small part of that payment (for example
   250 of 1000 minor units). Capture the actual charge.refunded event ID. Verify
   the response outcome is partially_refunded, the event links to the correct
   attempt/payment, providerChargeId is saved, refundedCents is 250, and Payment
   is DISPUTED. Confirm completion/auto-release cannot release the full payout.
4. Refund another 350 minor units. Verify refundedCents is 600, not 850. Refund
   the remaining 400 and verify refundedCents is 1000 and both statuses are
   REFUNDED. Repeat with a separate payment refunded fully in one operation.
5. Using the Dashboard's resend facility against a registered sandbox webhook
   endpoint, redeliver the same event and then the older partial-refund event.
   Verify the total and statuses stay at 1000/REFUNDED and no extra payout or
   assignment activation occurs. For local forwarding, use Stripe CLI replay or
   a registered test tunnel endpoint as supported by your CLI/account.
6. On a second checkout, delay delivery of checkout.session.completed and deliver
   its real refund first. Verify pending_reconciliation and processedAt NULL.
   Deliver completion and verify the pending refund is applied automatically.
   Repeat by redelivering an already-processed completion after clearing the new
   IDs on an isolated historical test attempt to exercise the upgrade path.
7. Record sandbox event IDs, response outcomes, and before/after rows in the test
   report. For unmatched IDs, inspect Stripe and redeliver the matching checkout;
   do not acknowledge reconciliation as complete until local totals agree.
