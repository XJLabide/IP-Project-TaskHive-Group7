# TaskHive

TaskHive is a full-stack Next.js app for a community-based local errands marketplace. One account can post tasks, apply as a Tasker, chat before hiring, pay after approval, confirm completion, and review both sides.

## Architecture
- Next.js App Router + React + TypeScript
- REST API Route Handlers under `src/app/api`
- Better Auth for authentication
- Prisma + Supabase PostgreSQL for core marketplace data
- MongoDB Atlas for chat/log-style data
- Upstash QStash for async jobs
- Stripe test mode for payments
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
- Stripe is intended for test mode only in this project.
- Escrow and payout release are simulated through internal payment statuses.
- The frontend should call the app's custom REST API instead of directly mutating external services.
- Admin is global across the whole TaskHive app, not per community.
