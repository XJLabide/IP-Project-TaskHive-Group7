# TaskHive Architecture Plan

## Architecture Summary
The repository is a **single full-stack Next.js app** with a REST API exposed through Route Handlers under `src/app/api`. Firebase Authentication handles identity and sessions; PostgreSQL remains the marketplace system of record. Several non-auth integrations and marketplace functions remain proposals or incomplete.

## High-Level Architecture
```text
User Browser
    +--> OpenStreetMap tiles (Leaflet)
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
| NoSQL | MongoDB Atlas | Reserved for log-style data; task chat, reports, and marketplace records use PostgreSQL. |
| Queue | Upstash QStash | Serverless-friendly async jobs. |
| Payments | Not selected | Evaluate PayMongo first; confirm platform eligibility and marketplace payout, refund, and dispute capabilities before implementation. |
| Maps and address search | Leaflet + OpenStreetMap tiles; Photon geocoder | Map pin selection for approximate task areas and Tasker search origins; server-side, Philippines-filtered address suggestions for the private service address. |
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
      tasks/
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
- `/api/tasks/:id/publish`
- `/api/tasks/:id/cancel`
- `/api/tasks/:id/bids`
- `/api/tasks/:id/requests`
- `/api/tasks/:id/hire`
- `/api/applications`
- `/api/applications/:id`
- `/api/tasks/:id/complete`
- `/api/tasks/:id/confirm`
- `/api/payments/checkout`
- `/api/payments/webhook`
- `/api/reviews`
- `/api/chats`
- `/api/chats/:id/messages`
- `/api/notifications`
- `/api/notifications/:id`
- `/api/reports`
- `/api/disputes`
- `/api/admin/dashboard`
- `/api/admin/reports`
- `/api/uploads/signature`
- `/api/jobs`

## Architecture Decision
Use Next.js full-stack instead of Vite + NestJS + Render. This reduces deployment complexity while preserving a clear custom REST API through Next.js Route Handlers.

## Notification delivery
Marketplace notification events are persisted with a stable event key before Next.js schedules QStash publishing after the response. The job carries only the notification ID, verifies the QStash signature, sends only to a user with a verified email, and uses the notification ID as Resend's idempotency key. Per-event email preferences are not modeled yet; verified email is the current contact gate. QStash retries failed deliveries; the notification row records sent, skipped, or failed status, while exhausted queue retries remain visible in QStash's failure queue. Email links point to the signed-in My Work area so destination data is still loaded through the user's authenticated session. The inbox API scopes reads and mark-read actions to the authenticated user.

Configure `QSTASH_TOKEN`, `QSTASH_DESTINATION_URL`, `QSTASH_CURRENT_SIGNING_KEY`, and `QSTASH_NEXT_SIGNING_KEY` for queued delivery. Configure `RESEND_API_KEY` and an `EMAIL_FROM` address on a verified sender domain for real user email. Without those values, notification email is not delivered; in-app records remain available to the account APIs.

## Marketplace integration constraints
- Payment must be provider-managed: Poster checkout at hire, then provider-routed Tasker payout after completion. This is not legal escrow.
- Selection opens a 24-hour payment hold; the assignment activates only on a verified provider callback. Expiry reopens the task with the other applications retained.
- Provider callbacks are idempotent through `PaymentEvent`; the unsigned fake provider is disabled in production unless `ALLOW_FAKE_PAYMENTS=1`.
- The provider is unresolved. PayMongo is the first candidate to evaluate, not an approved selection. Keep the payment integration replaceable and avoid provider-specific assumptions in marketplace rules.
- Tasker identity documents remain with the verification provider; TaskHive stores only status and provider reference.
- Exact local service addresses are private until payment succeeds and assignment activates.
- The architecture must support payment retry, refunds, disputes, completion auto-release, in-app/email notifications, and auditable Admin decisions.

## Current implementation boundaries
The marketplace UI still uses static/local task data and is not connected to production marketplace persistence, payment, or payout infrastructure. The API has PostgreSQL notification records and an authenticated `/api/notifications` inbox read/mark-read boundary, plus QStash/Resend delivery code; production delivery depends on the environment configuration above. The dedicated notification inbox UI is tracked separately. The current app uses an 18+ self-attestation for posting and applying; no identity-verification provider is configured, so the production identity gate before assignment remains unavailable. Firebase Authentication is configured for Production; the Firebase-auth application build still needs deployment and live-flow verification. Update the stack table as other vendors are selected and implemented.

## Map usage boundary
Interactive Leaflet maps use OpenStreetMap's public raster tile service. TaskHive sends debounced address queries from its server route to Photon for suggestions. Keep exact service addresses separate from the public approximate-area pin and disclose that address search text is sent to Photon. Show OpenStreetMap attribution, honor browser tile caching, and do not prefetch or offer offline tile downloads. Photon describes its public server as a demo with reasonable-use expectations and no availability guarantees; configure `PHOTON_URL` to use another compatible Photon instance when production traffic requires service guarantees.
