# TaskHive Architecture Plan

## Architecture Summary
TaskHive uses a **single full-stack Next.js app** deployed on Vercel. The app still satisfies the custom RESTful API requirement by exposing explicit Route Handlers under `src/app/api`.

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
          +--> Stripe API
          +--> Mapbox API
          +--> Resend API
          +--> Cloudinary API
```

## Implemented Stack
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
| Payments | Stripe test mode | Checkout and payment lifecycle simulation. |
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
