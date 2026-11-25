# TaskHive

TaskHive is a frontend prototype for a planned production-ready marketplace across the Philippines. Adults can browse local services and curated remote tasks; one account can post and task. The intended product includes task applications, provider-managed payment/payout, completion, support, and reviews. See [the SRS](docs/SRS.md) and [user flows](docs/Design%20Guidelines/USER_FLOWS.md) for the approved direction.

The UI does not yet connect to a marketplace backend. Firebase Authentication is configured for Production, but this Firebase-auth code has not yet been deployed or smoke-tested. Local/static marketplace interactions remain demonstration behavior, not durable task data, real identity checks, or payment processing.

## Proposed Production Architecture
- Next.js App Router + React + TypeScript
- REST API Route Handlers under `src/app/api`
- Firebase Authentication for identity and sessions only
- Prisma + Supabase PostgreSQL for core marketplace data
- MongoDB Atlas for chat/log-style data
- Upstash QStash for async jobs
- Payment provider not selected; evaluate PayMongo first, subject to eligibility and capability confirmation
- Mapbox for task locations
- Resend for email notifications
- Cloudinary for profile, portfolio, and proof uploads
- GitHub Actions for CI

## Getting Started
Install dependencies:

```bash
pnpm install
```

Copy the environment template:

```bash
cp .env.example .env.local
```

Generate Prisma Client:

```bash
pnpm prisma:generate
```

Start the development server:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Useful Commands
```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm prisma:validate
pnpm build
pnpm verify
pnpm providers:check
```

Before enabling payment adapters or production jobs, follow the
[provider readiness checks](docs/provider-readiness.md). The check uses explicitly
exported deployment settings, reports missing configuration without secrets,
and fails until both integrations are ready. Production checkout remains disabled.

The database security check and PostgreSQL regression suite are documented in
[Public-table database security](docs/database-security.md). CI runs these against
a disposable migrated database; integration tests require an explicit test URL.

Verification concurrency tests also run against disposable PostgreSQL in CI.
See [verification concurrency](docs/verification-concurrency.md) for local setup
and the state-conflict contract.

Authentication correlation IDs, redacted failure categories, and opt-in dependency
timings are documented in [Authentication diagnostics](docs/auth-diagnostics.md).

Admin queue pagination, timing diagnostics, regional-placement evaluation, and
the disposable PostgreSQL suite are documented in
[Admin dashboard performance](docs/admin-performance.md).

## Important Notes
- PayMongo is an evaluation candidate, not a confirmed provider. Do not implement provider-managed payout until marketplace eligibility and required capabilities are verified.
- TaskHive must not describe provider-managed payout as legal escrow.
- The frontend should call the app's custom REST API instead of directly mutating external services once the backend is implemented.
- The 5% TaskHive fee is provisional and deducted from Tasker payout in the approved product direction.
- Admin is global across the whole TaskHive app, not per community.
