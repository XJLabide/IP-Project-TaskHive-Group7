# Completion transaction rollback verification

## Automated service boundary

`src/lib/completion/service.test.ts` exercises `confirmCompletion` and `autoReleaseCompletions` through their public service functions. Race fixtures force a compare-and-set update to affect zero rows after earlier updates in the same callback. The test asserts that the interactive-transaction callback throws, the service returns/skips the state change, and no completion notification is sent. Missing payout rows are checked both before confirmation starts and after auto-release has begun.

Prisma commits an interactive transaction only when its callback resolves. The completion service therefore throws a private invariant error on any conditional transition that does not update exactly one row. Catching that error happens outside `$transaction`; it maps to `invalid_state` for interactive confirmation or skips the auto-release record. Unexpected database errors are rethrown.

## PostgreSQL verification checklist

Run this against a disposable migrated PostgreSQL database, never the production database:

1. Create a task at `AWAITING_CONFIRMATION`, an `ACTIVE` assignment, a `PAID_PENDING_COMPLETION` payment, and an unreleased payout.
2. Invoke Poster confirmation while a second transaction changes the task status before the completion service's conditional task update. Expect confirmation to fail with `invalid_state`; assert payment remains `PAID_PENDING_COMPLETION`, payout remains unreleased, and assignment remains `ACTIVE`. The concurrent task status change should remain committed.
3. Repeat through `autoReleaseCompletions`, using either the same task-state race or a missing payout row. Expect `released: 0`, no completion notifications, and no partial payment/task/assignment updates from the failed release transaction.
4. Run the same functions without a competing change. Expect payment `RELEASED`, task `COMPLETED`, payout released, assignment `COMPLETED`, and notifications only after commit.

The PostgreSQL checklist was not run during this implementation because no database URL is configured in this workspace. A live database check is still required before treating the production financial-transition boundary as verified. Invariant conflicts are logged with task/assignment IDs and the failed transition name; there are no automatic retries of the individual failed transaction. The existing scheduled completion job can process still-due records on its next run after the conflicting state is reconciled.
