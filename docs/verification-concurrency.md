# Verification concurrency

Issue #70: provider callbacks, initial verification submissions, and Admin appeal
decisions previously calculated a transition from a snapshot and then upserted it
unconditionally. Two requests could both report success, overwrite a newer
decision, or leave application withdrawals and Admin audit records inconsistent
with the final verification status.

## State-conflict contract

Existing verification records are claimed with a conditional write matching their
observed ID, status, appeal status, and appeal count. The lifecycle never returns
to an earlier combination of these state fields. The one permitted appeal is
claimed by its rejected status and unused appeal count. First submissions without
a record use an insert that ignores a conflicting unique `userId`; they never
update a record created after their initial read.

Only a successful claim proceeds to withdraw applications or write an Admin audit
entry, in the same transaction. A competing request returns
`ok: false, code: "invalid_transition"` without these effects. Existing HTTP
handlers translate this to 409. Callers should reload verification status before
deciding whether another action is appropriate. Duplicate and late callbacks
remain conflicts rather than replay successes. An unexpected database error
still propagates; a failed audit write rolls back the state claim.

Notifications run after the winning transaction commits. Delivery remains best
effort under the existing notification design; this change does not add an
outbox or guarantee delivery after a process crash. Concurrent application
submission/assignment is outside this verification-transition fix; the claim
does not serialize unrelated application writers.

No migration or additional identity data is required. Existing server-side
authorization and provider-secret validation still apply. The provider retains
identity documents; only existing status/reference metadata is stored.

## PostgreSQL regression suite

Use Node 22 and an **explicit disposable PostgreSQL database**, never production.
The database role must own the migrated tables and be able to inspect its
connections in `pg_stat_activity`. Allow at least two connections per client.

```bash
export VERIFICATION_TEST_DATABASE_URL='postgresql://taskhive:taskhive@localhost:5432/taskhive_verification_test?schema=public&connection_limit=5'
DATABASE_URL="$VERIFICATION_TEST_DATABASE_URL" pnpm db:migrate
pnpm test:verification
```

The dedicated config fails if `VERIFICATION_TEST_DATABASE_URL` is absent and
overrides the service database URL with that explicit target. Tests create
uniquely named users and clean up their related fixtures; committed test rows
exist briefly during each exercise. The suite is separate from `pnpm test` and
is run by CI after replaying the migrations in its disposable PostgreSQL service.

The tests call the public verification service, then read verification state,
application status, and the Admin queue through service interfaces. PostgreSQL
table locks hold competing writes until both requests have read their snapshots;
the suite checks that both are waiting before releasing the lock. It covers:

- Conflicting and duplicate provider decisions, with bid/request withdrawals
  matching the winning decision.
- Conflicting and duplicate Admin decisions, with exactly one matching audit
  entry visible in the Admin queue.
- First submissions with and without an existing record, and concurrent use of
  the one permitted appeal.
- Late provider decisions after an approved or denied appeal.
- Rollback when an Admin audit cannot be persisted.

The database and inbox persistence are real. Only Next.js `after` scheduling is
substituted, so email is not sent. These tests do not exercise HTTP middleware,
Firebase authentication, external provider delivery, or production deployment.

The initial provider-conflict and missing-record submission regressions were each
observed failing before their fixes: both concurrent requests reported success.
The completed suite passed all 12 cases on a disposable, fully migrated
PostgreSQL 16.15 database.

Local validation also passed all 499 regular tests, typechecking, ESLint, Prisma
schema validation, and the production build. The local runtime was Node 24.9.0
(pnpm warns because the project requires 22.x); CI is configured for Node 22.x.
