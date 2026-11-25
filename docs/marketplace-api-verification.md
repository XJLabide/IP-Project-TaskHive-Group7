# Persisted review, dispute, and public-profile APIs

Issue [#66](https://github.com/XJLabide/IP-Project-TaskHive-Group7/issues/66).

The generic review/dispute routes now call the same authoritative completion
services as the task-scoped routes. They return persisted identifiers, not demo
IDs or echoed payloads. The public-profile route reads stored public facts.
There are no UI, database schema, migration, or authentication implementation
changes. This work is independent of the open refund, auth-cache, and RLS PRs.

## Request and response contracts

### POST /api/reviews

Requires the server session. JSON contains taskId, integer rating (1–5), and an
optional comment of at most 2,000 characters. The optional legacy revieweeId is
accepted but ignored: the counterpart comes from the task/assignment, and the
reviewer comes from the session. Submitted reviewerId/other unknown fields cannot
change the acting user. Missing task IDs and malformed/null/array JSON return 422.

Success is HTTP 201 with data containing ok, reviewId, published, and publishAt.
The former fabricated id/reviewerId/payload echo is replaced by this service result.
Review creation still requires a completed task and participation, prevents a
second review, and retains the existing blind-publication rules: both participants
submit or the publication job reaches the 14-day deadline. The caller can see its
own submission result; unpublished ratings do not enter public-profile averages.

### POST /api/disputes

Requires the server session. JSON contains taskId and a trimmed reason of 5–2,000
characters. The acting user comes from the session. Success is HTTP 201 with data
containing ok, disputeId, and taskId, returned after the existing service stores
the dispute and freezes the task, assignment, and payment. Existing participation,
state, already-open, and payout-release checks apply. This route inherits the
canonical service's current completion-dispute state behavior; it does not
introduce a new cancellation or post-payout support workflow.

Both write routes return 401 for guests and propagate domain failures (403 for
nonparticipants, 404 for missing records, and 409 for conflicting state). Input
validation returns 422. Unexpected service/database failures return a generic 503
without raw database details. No success DTO is fabricated on failure. These
legacy generic paths have no discovered repository UI callers; task-scoped paths
and their response contracts remain unchanged.

### GET /api/profiles/:id

This public endpoint returns only id, name, skills, verificationStatus,
taskerRating, posterRating, completedTasks, and postedTasks. The verified badge is
shown only for a stored VERIFIED decision; all other verification states become
not_verified, without disclosing rejection or appeal details. Missing/suspended
accounts return 404. Read failures return a generic 503. Success uses no-store.

Ratings are role-specific database averages of reviews for completed tasks whose
publishedAt is no later than the current time. No published ratings means null,
not a fabricated score. completedTasks counts completed Tasker assignments on
completed tasks. postedTasks counts the account's tasks with a publication date,
excluding drafts that have never been published. Missing profile skills become
an empty list. Contact details, email, coordinates, account roles, identity-provider
references, and review comments are never included in the public DTO. Private
account functionality remains under the authenticated /api/users/me boundary.

## Automated verification

Normal route tests exercise validation, session enforcement, domain error mapping,
service failure responses, trusted identity selection, and profile response handling:

```sh
pnpm exec vitest run src/app/api/reviews/route.test.ts \
  src/app/api/disputes/route.test.ts 'src/app/api/profiles/[id]/route.test.ts'
```

Real persistence tests use a separate, explicitly supplied disposable PostgreSQL
database. Do not use production. Install dependencies, generate Prisma Client,
and apply the branch's existing migrations to that disposable database first:

```sh
DATABASE_URL='<disposable PostgreSQL URL>' pnpm db:migrate
MARKETPLACE_API_TEST_DATABASE_URL='<disposable PostgreSQL URL>' \
  pnpm exec vitest run --config vitest.marketplace-api.config.mts
```

The integration suite refuses to run without MARKETPLACE_API_TEST_DATABASE_URL;
it never falls back to DATABASE_URL. It creates unique fixture users/tasks and
removes only those fixtures. Route handlers, validation, completion services,
Prisma queries, transactions, and subsequent reads are real. Session identity and
notification delivery are substituted, so these tests do not claim to verify
Firebase exchange, notification delivery, or HTTP hosting middleware.

All 10 integration tests passed against an isolated PostgreSQL 16.15 database
migrated from this branch. Coverage includes durable review/dispute rows, forged
identities, duplicates, task-state and participant denials, blind/revealed review
visibility, persisted public-profile data, both role averages, draft exclusion,
missing/suspended accounts, empty reputation, and private-field exclusion. The
separate config keeps this branch independent of the CI/database-security changes
in PR #81; normal pnpm test does not require a database. Maintainers can run this
suite against disposable databases before deployment or add it to database CI.

## Deployment verification

No new migration is required. Deploy the application code through the normal
maintainer process, then use authorized test accounts to create a review after
completion and open a dispute before payout release. Confirm the returned IDs
exist in the intended database and that public profile averages change only after
publication. Check guest/nonparticipant rejection and missing-profile 404 behavior.
Never interpret a 201 as provider payout/refund execution: these endpoints manage
application review/dispute state, while payment operations retain their existing
provider and support boundaries. Production was not modified or exercised here.
