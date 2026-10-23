# Authentication setup

TaskHive uses [Firebase Authentication](https://firebase.google.com/docs/auth) for email/password identity, email verification, password reset, and optional Google sign-in. Firebase is used **only for authentication**. PostgreSQL/Supabase and Prisma remain the source of truth for TaskHive users, profiles, authorization state, and marketplace data. The server exchanges Firebase ID tokens for HTTP-only session cookies and resolves the Firebase UID to an internal PostgreSQL `User.id`.

## Environment variables

Configure these in local `.env.local` and Vercel Production. Set the `NEXT_PUBLIC_*` client values for Preview too if Preview auth is needed. Never commit the service-account JSON or print secret values.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Existing pooled PostgreSQL connection string with TLS. |
| `NEXT_PUBLIC_APP_URL` | yes | Exact TaskHive origin, e.g. `https://taskhiveplatform.vercel.app`. Used for session-origin checks and email action return URLs. |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | yes | Firebase web app configuration; this is a public client setting. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | yes | Firebase project auth domain (usually `<project-id>.firebaseapp.com`). |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | yes | Firebase project ID. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | yes | Firebase web app ID. |
| `FIREBASE_PROJECT_ID` | yes on server | Project ID used by Firebase Admin. |
| `FIREBASE_SERVICE_ACCOUNT` | yes on server | Firebase service-account JSON stored as an encrypted Vercel Secret. Grant only Firebase Authentication administration needed by this app. |
| `FIREBASE_AUTH_EMULATOR_HOST` | optional local | Auth Emulator host such as `127.0.0.1:9099`; never set in production. |
| `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` | optional local | Browser SDK Auth Emulator host, matching the server emulator host. |
| `NEXT_PUBLIC_GOOGLE_AUTH` | optional | Set to `1` only after enabling Google as a Firebase sign-in provider. |
| `RESEND_API_KEY` / `EMAIL_FROM` | optional for auth | Remain for non-auth transactional notifications. Firebase sends its own verification and password-reset emails. |

Add `taskhiveplatform.vercel.app` to Firebase Authentication's authorized domains. The verification and password-reset emails use Firebase's hosted action handler (`%LINK%`); the client requests `https://<app-origin>/profile` as the verification continue URL and `https://<app-origin>/login` as the password-reset continue URL. The `/verify-email` and `/reset-password` pages are for TaskHive's in-app status/form flows; do not replace Firebase's hosted action URL with those routes unless the app implements the complete Firebase action-code handler there. Google sign-in, if enabled, is configured as a Firebase provider; there is no Better Auth OAuth callback URL.

## Local setup

Copy `.env.example` to `.env.local`, set the Firebase web app values and service-account JSON, and set `NEXT_PUBLIC_APP_URL=http://localhost:3000`. For local-only development, run `firebase emulators:start --only auth --project demo-taskhive` and set both `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` and `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`. Do not commit `.env.local` or service-account files.

If Firebase client or server configuration is absent, authentication requests fail closed with an actionable message; public guest browsing remains available.

## Database migration

Apply `prisma/migrations/20261024120000_add_firebase_uid` with `pnpm db:migrate` before deploying this implementation. It adds a nullable unique Firebase UID mapping to `User` and does not drop or rewrite existing auth or marketplace tables. The owner reports that no accounts have been created; still check production Better Auth user/account counts before cutover. If any exist unexpectedly, stop and preserve them before changing auth.

## Cutover and smoke test

1. Create or select the Firebase project; enable Email/Password and configure the verification and password-reset templates. Add `taskhiveplatform.vercel.app` and any chosen preview host to authorized domains.
2. Set the environment variables above in Vercel without exposing their values. Set `NEXT_PUBLIC_APP_URL` to the exact deployed origin.
3. Apply the forward-only Prisma migration with `pnpm db:migrate`. Do not reset the database or use `prisma db push` in production.
4. Deploy only after Firebase client and Admin configuration are ready; keep Better Auth tables during the rollback window.
5. Verify on the deployed URL: guest browsing; signup; email verification returns to profile and unlocks the email gate; sign-in/out; wrong password; password reset; unverified account blocked from posting/applying; Admin and private routes remain protected; no password is exposed in application URLs or logs. Firebase email action links carry one-time action codes by design.
6. Run the same flows at desktop and 390px mobile widths. Do not remove legacy Better Auth schema/dependencies until production acceptance and rollback closure.

## Current implementation status

Firebase project `taskhive-9d1c1` is configured with Email/Password enabled. Its web app client settings, `FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_APP_URL`, and the `FIREBASE_SERVICE_ACCOUNT` Secret are set in Vercel Production. The domain `taskhiveplatform.vercel.app` is authorized. Firebase's hosted verification and password-reset templates remain in use. The replacement service-account key was created after revoking the first key; the secret value is not recorded here.

The Firebase application code and forward-only schema migration are implemented in the `docs/auth-production-readiness` branch. On 2026-10-24 the Supabase database password was rotated through the Management API, the matching pooled `DATABASE_URL` was saved as a Vercel Production Secret, and a read-only PostgreSQL check succeeded. `pnpm db:migrate` applied `20261024120000_add_firebase_uid` successfully. The application deployment and live signup, sign-in, email delivery, verification, and password-reset flows have not yet been smoke-tested. Keep this status current as each cutover step is completed.

Supabase's project inspection also reported Row Level Security disabled on the public application tables. Review Data API exposure and define table policies before exposing the Supabase anon/authenticated API roles; enabling RLS without policies would block client access.
