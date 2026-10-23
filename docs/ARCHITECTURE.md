# TaskHive Architecture Plan

## Architecture Summary
The repository is a **single full-stack Next.js app** with a REST API exposed through Route Handlers under `src/app/api`. Firebase Authentication handles identity and sessions; PostgreSQL remains the marketplace system of record. Several non-auth integrations and marketplace functions remain proposals or incomplete.

## High-Level Architecture
```text
User Browser
    |
    v
Next.js App on Vercel
    |
    +--> React UI Pages
    |
    +--> REST API Route Handlers
          |
          +--> Firebase Authentication (identity and sessions only)
          +--> Prisma -> Supabase PostgreSQL
          +--> MongoDB Atlas
          +--> Upstash QStash
          +--> Payment provider (selection pending; evaluate PayMongo first)
          +--> Mapbox API
          +--> Resend API
          +--> Cloudinary API
```

## Proposed Production Stack
| Layer | Tool | Purpose |
| --- | --- | --- |
| App framework | Next.js App Router | Full-stack React app and REST route handlers. |
| Language | TypeScript | Shared typing across UI, API, validation, and services. |
| UI | Tailwind CSS + shadcn-style components | Product screens and reusable owned UI primitives. |
| Auth | Firebase Authentication | Email/password identity, email actions, optional Google sign-in; server verifies Firebase session cookies. |
| Main database | Supabase PostgreSQL | Relational marketplace data. |
| ORM | Prisma | Schema, migrations, and typed database client. |
| NoSQL | MongoDB Atlas | Chat messages and log-style data. |
| Queue | Upstash QStash | Serverless-friendly async jobs. |
| Payments | Not selected | Evaluate PayMongo first; confirm platform eligibility and marketplace payout, refund, and dispute capabilities before implementation. |
| Maps | Mapbox | Location search, picker, and nearby task support. |
| Email | Firebase Authentication + Resend | Firebase-managed verification/reset email; Resend for other transactional notifications. |
| Uploads | Cloudinary | Profile, portfolio, attachment, and proof uploads. |
| CI | GitHub Actions | Lint, typecheck, tests, Prisma validation, build. |

## Code Structure
```text
TaskHive/
  src/
    app/
      api/
      dashboard/
      login/
      signup/
      tasks/
      admin/
    components/
      layout/
      task/
      ui/
    lib/
      api/
      auth/
      integrations/
      mongo/
      queue/
      prisma.ts
      validation.ts
    types/
  prisma/
    schema.prisma
```

## REST API Surface
Route Handlers expose the custom API:
- `/api/auth/*`
- `/api/users/me`
- `/api/profiles/:id`
- `/api/tasks`
- `/api/tasks/:id`
- `/api/tasks/:id/bids`
- `/api/tasks/:id/requests`
- `/api/tasks/:id/hire`
- `/api/tasks/:id/complete`
- `/api/tasks/:id/confirm`
- `/api/payments/checkout`
- `/api/reviews`
- `/api/chats`
- `/api/chats/:id/messages`
- `/api/reports`
- `/api/disputes`
- `/api/admin/dashboard`
- `/api/uploads/signature`
- `/api/locations/search`
- `/api/jobs`

## Architecture Decision
Use Next.js full-stack instead of Vite + NestJS + Render. This reduces deployment complexity while preserving a clear custom REST API through Next.js Route Handlers.

## Marketplace integration constraints
- Payment must be provider-managed: Poster checkout at hire, then provider-routed Tasker payout after completion. This is not legal escrow.
- The provider is unresolved. PayMongo is the first candidate to evaluate, not an approved selection. Keep the payment integration replaceable and avoid provider-specific assumptions in marketplace rules.
- Tasker identity documents remain with the verification provider; TaskHive stores only status and provider reference.
- Exact local service addresses are private until payment succeeds and assignment activates.
- The architecture must support payment retry, refunds, disputes, completion auto-release, in-app/email notifications, and auditable Admin decisions.

## Prototype boundary
The marketplace UI still uses static/local data and must not be presented as connected identity verification, marketplace persistence, payment, payout, or notification infrastructure. Firebase Authentication integration is implemented in code but requires a configured Firebase project before it is live. Update the stack table as other vendors are actually selected and implemented.
