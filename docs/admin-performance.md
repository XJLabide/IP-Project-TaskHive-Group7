# Admin dashboard performance — issue #63

The Admin page previously waited for a single aggregate that loaded every open
report, dispute, cancellation, and verification appeal. Relation reads expanded
the nine Prisma operations into 18 SQL statements in the local benchmark, all
sharing a two-connection pool. Queue totals depended on fetching the full rows.

## Read and UI contract

`src/lib/support/reads.ts` contains the bounded readers. Every section returns ten
records and exact pagination metadata from one parameterized PostgreSQL statement.
It limits base records before joining related names/evidence. A date plus unique
ID makes ordering deterministic, including equal timestamps. Queues show oldest
first; recent tasks/users/decisions show newest first. Null appeal dates sort last.
UTC timestamps are restored explicitly from JSON, preserving Prisma's DateTime
semantics on servers outside UTC.

The overview counts share one SQL round trip and do not depend on a visible page.
Released platform fees are calculated only for the overview API that requests
them, rather than adding a payment-table scan to the Admin page.

The Admin page guards access before starting section reads, then uses separate
Suspense boundaries and loading/error states for totals and all seven sections.
Each section can display records independently; it does not wait for the aggregate
compatibility API. The current layout, themes, evidence, decision forms, and user
status controls are preserved. Pagination links preserve the other section pages,
avoid prefetching expensive pages, and remain usable without client-only data
loading. A section failure does not masquerade as an empty queue.

`GET /api/admin/support?section=reports&page=2` reads only that section. Supported
section names are `reports`, `disputes`, `cancellations`, `verificationAppeals`,
`recentTasks`, `recentUsers`, and `recentDecisions`. The aggregate endpoint still
returns the existing arrays/totals but bounds every array and adds `pagination`
metadata for each section. Its page parameters match the Admin page, for example
`reportsPage=2&recentUsersPage=3`. `GET /api/admin/dashboard` reads only totals
(including released fees) and a first reports page, with pagination metadata.
Consumers needing the rest of a queue must follow pagination.

Invalid/repeated page parameters or unsupported sections return 422 after the
Admin guard. Persistence failures return generic retryable 503 responses. The page
offers a first-page link for invalid URLs. Valid stale pages clamp to the current
last page, so resolving the last item cannot strand the user. Page-based reads
are live snapshots: concurrent insertions/resolutions can move records between
pages; refresh before acting on a case. Mutation guards and audit transactions
are unchanged. Queue contents, message bodies, and evidence remain Admin-only.

## Timing and pool contention

Normal reads use one statement each, without profiling transactions. Slow/error
reads emit redacted `[admin-performance]` events with section, outcome, operation
ID, total duration, and a validated runtime-region label. They never log SQL,
parameters, evidence, names, URLs, or raw error objects.

For a bounded diagnostic session, set `ADMIN_QUERY_DIAGNOSTICS=1`. Each read then
uses an interactive transaction to measure `acquisitionMs` until the callback
starts and `queryMs` around the statement. Acquisition includes Prisma pool
queueing **and BEGIN/network setup**. It is an observable acquisition duration,
not an exact measurement of PgBouncer's server wait. Query timing also includes
transport and client decoding, not just PostgreSQL execution. Normal events use
null for unavailable timing components rather than inventing a pool-wait value.

Profiling adds BEGIN/COMMIT round trips and briefly holds a connection: turn it
off after sampling. Compare warm median/p95 acquisition and query durations under
representative concurrent load. Use Supabase/PgBouncer monitoring for pooler-side
waiting, and PostgreSQL monitoring/EXPLAIN for server execution. Prisma's legacy
metrics API is not enabled by this change; its documented support is version
sensitive. See [Prisma metrics](https://www.prisma.io/docs/orm/v6/prisma-client/observability-and-logging/metrics).

## Measured local result

Same disposable PostgreSQL 16.15 database, 400 records in each of the four queues,
401 users, 800 tasks, roughly 2 KB of reason/note text per queue record, two client
connections, one warm-up and five measured aggregate reads:

| Metric | Before | After |
| --- | ---: | ---: |
| SQL statements per aggregate | 18 | 8 |
| Serialized aggregate response | 3,727,998 bytes | 96,826 bytes |
| Median warm aggregate time | 13.17 ms | 2.10 ms |

These numbers establish the local boundary improvement, not production latency
or Core Web Vitals. Network distance, actual data distribution, concurrent traffic,
cold starts, and exact-count scans can dominate production timings. The normal
page streams the same eight reads independently; changing one page currently
rerenders the bounded sections rather than maintaining a separate browser cache.

## Regional placement evaluation

No committed `vercel.json` pins a function region, and available local connection
settings do not establish the live database region. Project-level Vercel settings
can override defaults, so the live region mismatch from the original audit must
be rechecked in the deployment and database dashboards. This change does not
relocate production or increase the two-connection pool.

Vercel recommends locating compute near its database; see its
[function-region configuration](https://vercel.com/docs/functions/configuring-functions/region)
and [region list](https://vercel.com/docs/regions). Compare the diagnostic
`runtimeRegion` with the primary database and pooler region. Test a Preview
deployment in the nearest supported region with the same pool size and realistic
concurrency, then compare median/p95 acquisition/query/HTTP durations, errors, and
pool saturation. Prefer co-location when those measurements improve; an Asia
user base alone does not establish the database's location. Review residency,
provider connections, and failover needs before changing a project-wide region.
Do not mask a long network path by blindly increasing connection limits.

## Migration, validation, and rollout

Deploy `20261124100000_index_admin_queues` before this code. It adds ordering/filter
indexes only, without new tables, grants, or RLS changes. Ordinary CREATE INDEX
can block writes while building on large tables: schedule the migration in an
appropriate window and monitor it. The existing two-connection runtime URL stays
unchanged. Reverting application code restores unbounded reads; the added indexes
can remain until a deliberate follow-up migration removes them.

```bash
export ADMIN_TEST_DATABASE_URL='postgresql://taskhive:taskhive@localhost:5432/taskhive_admin_test?schema=public&connection_limit=2'
DATABASE_URL="$ADMIN_TEST_DATABASE_URL" pnpm db:migrate
pnpm test:admin
```

Use an explicit, isolated, disposable database, never production. The suite
creates committed fixtures temporarily and deletes its fixture-owned users and
cascading records afterward. `ADMIN_KEEP_FIXTURES=1` is a local visual-verification
aid; omit it for normal tests and CI. An optional `ADMIN_BENCHMARK_OUTPUT` writes
the safe timing/size summary to a chosen local file.

Eight real PostgreSQL tests cover all bounded queues, exact totals, tie ordering,
disjoint pages, stale-page recovery, UTC/null dates, released fees, resolved-case
filtering, and acquisition delay with both pool slots occupied. Regular tests
cover pagination validation and Admin API authorization/failure responses. CI
runs the PostgreSQL suite against its disposable migrated database.

Local visual verification used disposable fixtures with a temporary, local-only
preview route, removed before commit. Desktop (1440px) and mobile (390px), light
and dark, showed no horizontal overflow. Page controls and totals were checked.
A table-lock exercise confirmed other sections stream while reports wait; a
temporary table rename confirmed error isolation and retry UI, then was restored.
Actual unauthenticated Admin API requests returned 401. This does not claim to
exercise Firebase login or production access. Refero live research was unavailable
because the subscription was inactive; bundled craft guidance and the existing
TaskHive design were used. Impeccable's mechanical detector reported no findings.

All 518 regular tests, eight PostgreSQL tests, typechecking, ESLint, Prisma
schema validation, and the production build passed. Local validation used Node
24.9.0 (pnpm warns about the project's 22.x engine requirement); CI uses Node 22.x.
