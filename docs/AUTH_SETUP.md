# Authentication setup

TaskHive uses [Better Auth](https://www.better-auth.com) with Prisma on PostgreSQL. Accounts, sessions, email verification, and password reset are real; nothing in the auth path is mocked.

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string (local, Supabase, Neon, …) |
| `BETTER_AUTH_SECRET` | yes | Signing secret. Generate with `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | yes | Public URL of the deployment, e.g. `https://taskhive.example` |
| `RESEND_API_KEY` | production | Sends verification and reset emails |
| `EMAIL_FROM` | production | Verified sender, e.g. `TaskHive <hello@taskhive.example>` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional | Enables Google sign-in |
| `NEXT_PUBLIC_GOOGLE_AUTH` | optional | Set to `1` to show the Google button |

On Vercel, `VERCEL_URL` and `VERCEL_PROJECT_PRODUCTION_URL` are trusted automatically in addition to `BETTER_AUTH_URL`.

## Local development

```bash
createdb taskhive
export DATABASE_URL="postgresql://$USER@localhost:5432/taskhive?schema=public"
export BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
export BETTER_AUTH_URL="http://localhost:3000"

npx prisma migrate deploy   # or: pnpm db:migrate
pnpm dev
```

Without `RESEND_API_KEY`, verification and reset emails are **not delivered**. The full message, including the action link, is printed to the server console as `[email:dev] …`. Copy the link into the browser to complete either flow.

## Deploying

1. Provision PostgreSQL and set `DATABASE_URL` on the host (Vercel → Project → Settings → Environment Variables).
2. Set `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `RESEND_API_KEY` / `EMAIL_FROM`.
3. Apply migrations **before** the app serves traffic: `pnpm db:migrate` (`prisma migrate deploy`). The build does not run migrations.
4. Verify a Resend sender domain so verification and reset emails reach real inboxes.
5. Optional: add Google OAuth credentials and set `NEXT_PUBLIC_GOOGLE_AUTH=1`.

## Behaviour

- Sign-up creates the account and sends a verification email (`sendOnSignUp`).
- Sign-in works before verification, but posting and applying require a verified email plus the 18+ attestation (see `src/lib/domain/access.ts`).
- Verification links land on `/api/auth/verify-email` and then return to `/profile`.
- Password reset links expire after one hour and land on `/reset-password?token=…`.
- If email delivery fails, sign-up and reset requests still succeed; the failure is logged.
