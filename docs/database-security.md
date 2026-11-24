# Public-table database security

Issue [#72](https://github.com/XJLabide/IP-Project-TaskHive-Group7/issues/72)
reported a production RLS migration missing from Git. That migration,
`20261116111000_secure_public_tables`, is already tracked in the base branch.
Keep it unchanged: editing an applied migration changes its checksum.

The later `PaymentAttempt` table was not covered by that migration's fixed list.
`20261122110000_secure_payment_attempts` enables its RLS and revokes table
privileges from PUBLIC and the optional `anon`/`authenticated` roles. It adds no
policies and does not force RLS on the application owner. Apply this forward
migration with `pnpm db:migrate` before treating the gap as fixed in a deployed
environment. No production database was changed during implementation.

## Access model

TaskHive authorizes users in its Next.js server and accesses marketplace data
through Prisma. Supabase Data API roles must not access public application tables
directly. RLS without policies denies their row access; revoked privileges also
block operations such as TRUNCATE that RLS does not protect. The application owner
retains its server-side access. See PostgreSQL's
[row security](https://www.postgresql.org/docs/16/ddl-rowsecurity.html) and
[privilege inquiry](https://www.postgresql.org/docs/16/functions-info.html#FUNCTIONS-INFO-ACCESS-TABLE)
documentation.

`20261117170000_revoke_public_api_default_privileges` protects future objects from
API-role default grants for its configured creation roles. It does not enable RLS
on future tables; every new table migration must do that explicitly.

## Read-only deployed-schema check

Generate Prisma Client, then supply the intended database URL explicitly:

```sh
pnpm prisma:generate
DATABASE_URL='<intended PostgreSQL URL>' pnpm db:security:check
```

The command deliberately does not load .env files. It runs the static SELECT in
`prisma/security/check-public-tables.sql` and exits nonzero on findings or failure
to complete. Output contains object names and finding categories, never connection
strings, credentials, raw database errors, or application rows. Use an account
with catalog visibility and privilege-inquiry access; no application-data reads
or schema writes are performed by the checker. A missing migration-history table
also fails the check to help detect an unmigrated or wrongly targeted database.

The check inspects catalog entries rather than a Prisma model allowlist:

- Every ordinary or partitioned public table, including migration history, must
  have RLS enabled, even if direct API grants have already been revoked.
- PUBLIC table/column grants and effective `anon`/`authenticated` privileges are
  rejected. Effective checks include role membership and column-only access.
- Public views, materialized views, and foreign tables are checked for grants;
  they cannot use the ordinary-table RLS requirement.
- API roles may be absent on plain PostgreSQL; PUBLIC grants and table RLS are
  still checked. Integration tests require both roles to exercise API access.

This is a public-table guard for the server-only access model. It does not audit
other exposed schemas, sequences, functions/RPCs, policy semantics, or elevated
service-role credentials. An intentional direct Data API feature needs an explicit
security design and a reviewed change to this guard, not a blanket exception.
For migration owners other than those covered by the default-privilege migration,
review their defaults separately.

## PostgreSQL integration tests and CI

CI starts PostgreSQL 16, creates the test API roles with deliberately permissive
default grants, replays every tracked migration, runs the read-only check, and runs
`pnpm test:db-security`. This catches a new unprotected table even if its migration
is absent from the original hardening list. Normal `pnpm test` remains available
without a database; the dedicated security suite is a required CI step.

For local integration verification, use a new disposable PostgreSQL database and
an owner capable of creating roles. This setup grants test privileges and must
never run against production:

```sh
psql '<disposable PostgreSQL URL without Prisma schema parameters>' \
  --set=ON_ERROR_STOP=1 --file=tests/database/api-roles.sql
DATABASE_URL='<disposable PostgreSQL URL>' pnpm db:migrate
DATABASE_URL='<disposable PostgreSQL URL>' pnpm db:security:check
SECURITY_TEST_DATABASE_URL='<disposable PostgreSQL URL>' pnpm test:db-security
```

The test roles are cluster-wide, so use a dedicated local/test PostgreSQL cluster.
The test suite requires SECURITY_TEST_DATABASE_URL and never falls back to
DATABASE_URL. Test-created tables, role grants, and roles are rolled back in
transactions. Tests cover a clean migrated schema, unprotected new tables, PUBLIC,
direct, inherited and column grants, view exposure, missing migration history,
actual SQL permission denial for both API roles, and owner/default-deny RLS access.

Local verification used an isolated PostgreSQL 16.15 cluster. Replaying the previous
15 migrations reproduced `RLS_DISABLED: public."PaymentAttempt"`; applying the
forward migration passed the checker and all 12 integration tests. This checks
actual PostgreSQL behavior, not a mocked catalog or regex over migration SQL.

Before deployment, the maintainer should compare production migration history
with Git and apply only pending migrations through Prisma. If the original SQL
was applied outside Prisma, inspect and reconcile its history only after verifying
the equivalent changes; do not reset the database, rewrite applied SQL, or mark an
unverified migration as applied. Run the read-only check after migration and smoke
test a normal server-side marketplace read. Do not restore broad API grants to
resolve a runtime-role problem; check the server credential's intended ownership.
