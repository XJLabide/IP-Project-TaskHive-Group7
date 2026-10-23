# TaskHive

TaskHive is currently a static frontend prototype for a planned production-ready marketplace across the Philippines. Adults can browse local services and curated remote tasks; one account can post and task. The intended product includes task applications, provider-managed payment/payout, completion, support, and reviews. See [the SRS](docs/SRS.md) and [user flows](docs/Design%20Guidelines/USER_FLOWS.md) for the approved direction.

The UI does not yet connect to a marketplace backend. Local/static interactions are demonstration behavior, not durable accounts, real verification, or payment processing.

## Proposed Production Architecture
- Next.js App Router + React + TypeScript
- REST API Route Handlers under `src/app/api`
- Better Auth for authentication
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
```

## Important Notes
- PayMongo is an evaluation candidate, not a confirmed provider. Do not implement provider-managed payout until marketplace eligibility and required capabilities are verified.
- TaskHive must not describe provider-managed payout as legal escrow.
- The frontend should call the app's custom REST API instead of directly mutating external services once the backend is implemented.
- The 5% TaskHive fee is provisional and deducted from Tasker payout in the approved product direction.
- Admin is global across the whole TaskHive app, not per community.
