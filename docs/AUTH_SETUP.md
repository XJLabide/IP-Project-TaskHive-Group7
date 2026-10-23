# Authentication setup

TaskHive implements [Better Auth](https://www.better-auth.com) with Prisma on PostgreSQL. Signup, sessions, email verification, and password reset use the real auth code path. The custom production domain now serves the latest build; production configuration remains incomplete because no TaskHive sender domain is verified.

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Pooled production PostgreSQL connection string. For Supabase, use the pooler connection string with `sslmode=require`; never use a placeholder or `prisma db push` in production. |
| `BETTER_AUTH_SECRET` | yes | Signing secret. Generate with `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | yes | Exact public origin of the deployment. Production: `https://taskhiveplatform.vercel.app`. If preview auth is enabled, set the Preview value to the exact preview origin used for that deployment. |
| `RESEND_API_KEY` | production | Sends verification and reset emails |
| `EMAIL_FROM` | production | Sender address on a domain verified in Resend, e.g. `TaskHive <hello@verified-domain.example>` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional | Enables Google sign-in |
| `NEXT_PUBLIC_GOOGLE_AUTH` | optional | Set to `1` to show the Google button |

For Google OAuth, set the authorized redirect URI to `<BETTER_AUTH_URL>/api/auth/callback/google`. Do not set the `NEXT_PUBLIC_` flag unless both OAuth credentials are configured.

### Production configuration status

As checked on 2026-10-23:

- Vercel Production has `BETTER_AUTH_URL` and `BETTER_AUTH_SECRET` configured. Their values are encrypted in Vercel and are intentionally omitted from documentation.
- A Supabase project named `TaskHive-Production` was created in `Personal Projects` (`ap-southeast-1`, Singapore; project ref `lcpaabwijxgfqeojuyul`) after confirmation of the $0/month quote. Vercel Production has `DATABASE_URL` set as a Secret. Migration `20261023140227_init` was applied with `prisma migrate deploy` in a Vercel Production build; Supabase's `_prisma_migrations` table confirms one applied migration.
- Vercel Production has `RESEND_API_KEY` set as a Secret. Resend has no custom sender domains configured, and `EMAIL_FROM` is unset. A test message from Resend's `onboarding@resend.dev` sender was accepted and marked delivered to the Resend account email; this sender is only suitable for testing.
- The signup verification callback now requests `/profile` in the code. The latest successful build is `https://taskhive-jfi8i7fv0-labidexj-5344s-projects.vercel.app`, promoted to `https://taskhiveplatform.vercel.app` on 2026-10-23. The public root returned HTTP 200 after promotion.

Signup, verification email, and password reset cannot be accepted as production-ready yet. Configure a verified TaskHive sending domain, set `EMAIL_FROM`, then complete the auth smoke tests. Add Preview values only if preview authentication/email testing is wanted. Secret values must not be committed or copied into logs.

## Local development

```bash
createdb taskhive
export DATABASE_URL="postgresql://$USER@localhost:5432/taskhive?schema=public"
export BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
export BETTER_AUTH_URL="http://localhost:3000"

npx prisma migrate deploy   # or: pnpm db:migrate
pnpm dev
```

Without `RESEND_API_KEY`, verification and reset emails are **not delivered**. In local development only, the message and action link are printed to the server console as `[email:dev] …`. Never use that development behavior as proof that production email works.

## Deploying

1. Provision production PostgreSQL in the chosen provider/organization. For Supabase, select the pooled connection string and require SSL. Store it as Vercel Production `DATABASE_URL`.
2. Set `BETTER_AUTH_SECRET` (random 32+ bytes) and `BETTER_AUTH_URL=https://taskhiveplatform.vercel.app` in Production. Use a separate exact origin for Preview only if Preview auth is enabled.
3. Set `RESEND_API_KEY` and `EMAIL_FROM` in Vercel Production. Confirm the sender domain is verified in Resend before testing.
4. Apply checked-in migrations **before** serving traffic, using `prisma migrate deploy` / `pnpm db:migrate` against the production database. Never use `prisma db push` against production. The build does not run migrations.
5. Send a real test email from the configured Resend sender and verify signup and password-reset messages arrive.
6. Optional: add Google OAuth credentials, set `NEXT_PUBLIC_GOOGLE_AUTH=1`, and register `<BETTER_AUTH_URL>/api/auth/callback/google` as an authorized redirect URI.

## Behaviour

- Sign-up creates the account and sends a verification email (`sendOnSignUp`).
- Sign-in works before verification, but posting and applying require a verified email plus the 18+ attestation (see `src/lib/domain/access.ts`).
- Signup verification and resend-verification links land on `/api/auth/verify-email` and then return to `/profile` (`callbackURL: "/profile"`).
- Password reset links expire after one hour and land on `/reset-password?token=…`.
- If email delivery fails, sign-up and reset requests still succeed; the failure is logged.
