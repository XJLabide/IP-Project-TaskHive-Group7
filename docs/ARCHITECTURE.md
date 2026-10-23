# TaskHive Architecture Plan

## Architecture Summary
The current repository is a static frontend prototype. The proposed production direction is a **single full-stack Next.js app** with a custom REST API exposed through Route Handlers under `src/app/api`. This architecture is a proposal, not a claim that the API or integrations are implemented.

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
          +--> Better Auth
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
| Auth | Better Auth | Email/password auth, sessions, protected API access. |
| Main database | Supabase PostgreSQL | Relational marketplace data. |
| ORM | Prisma | Schema, migrations, and typed database client. |
| NoSQL | MongoDB Atlas | Chat messages and log-style data. |
| Queue | Upstash QStash | Serverless-friendly async jobs. |
| Payments | Not selected | Evaluate PayMongo first; confirm platform eligibility and marketplace payout, refund, and dispute capabilities before implementation. |
| Maps | Mapbox | Location search, picker, and nearby task support. |
| Email | Resend | Transactional notifications. |
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
The current UI uses static/local data and must not be presented as connected authentication, identity verification, persistence, payment, payout, or notification infrastructure. Update the stack table as vendors are actually selected and implemented.
