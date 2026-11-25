# Authentication failure diagnostics — issue #68

Session resolution still fails closed in production: invalid sessions, missing
domain accounts, and Firebase/database failures return no authenticated context.
Existing API statuses, origin checks, cookie flags, revocation checks, account
DTOs, and development-only fallbacks are preserved. This change adds diagnostics
to session resolution and the session-cookie exchange; it does not add a UI,
change authorization policy, or convert every application/database log.

## Request correlation

Proxy generates a fresh UUID for application HTTP requests, overwrites any
incoming `x-taskhive-request-id`, and forwards that internal header to server
readers. Responses, including the existing dashboard guest redirect, receive
`x-request-id` with the same value. Match that response header to an auth event's
`requestId`. IDs are opaque and are not derived from a cookie, user, email, IP, or
provider reference. They are diagnostic context, never an authorization input.

The Proxy matcher covers pages and APIs while skipping Next assets, the public
`/images/` tree, and root metadata files. It does not treat arbitrary image-like
suffixes on application route IDs as assets. Only `/dashboard` keeps its pre-existing fast guest redirect;
other routes retain their own page/API guards. Proxy performs no Firebase or
database operations and does not inspect credentials beyond the existing cookie
presence check. Request headers are forwarded upstream, not echoed as response
headers.

If a server reader is called without Proxy headers, a React-cached UUID is shared
within that render. It is newly generated outside a render. There is no global
credential/result cache. The verified-context cache includes the raw cookie and
request ID; repeated session/actor readers, even with copied Headers wrappers,
still share one Firebase verification and one user lookup in the same render.
New/concurrent requests remain isolated. Outside React rendering, reads continue
to reverify and explicit post-mutation account reads remain uncached.

## Event contract

`[auth-diagnostics]` emits a structured record with these fields only:

| Field | Meaning |
| --- | --- |
| `requestId` | Server-generated correlation UUID |
| `operation` | `resolve_session` or `create_session` |
| `outcome` | `authenticated`, `denied`, or `development_fallback` |
| `category` | Fixed category from the table below, never arbitrary error text |
| `stage` | Fixed dependency/stage name, or null for successful completion |
| `timingsMs` | Durations for attempted stages; absent stages were not run |
| `durationMs` | Total auth operation time, excluding Proxy and unrelated work |

Dependency stages distinguish Firebase setup, session/ID-token verification,
session-cookie creation, database account lookup, email synchronization, and
account upsert. Cookie decoding and unexpected completion failures have their
own stages. Timings use a monotonic clock and include awaited SDK/network/client
work; they are not pure vendor or PostgreSQL execution timings.

Failures and development fallback events use `console.warn`. Successful reads
are quiet by default; `AUTH_DIAGNOSTICS=1` enables successful timing events via
`console.info` for a bounded diagnostic session. Successful operations taking at
least one second also emit timing events. Ordinary guests without a session
cookie do not produce auth events. A render emits one resolution event, rather
than one for every layout/guard reader. Session exchange validates origin/body
before starting its dependency trace. Logging is best effort and logger failures
cannot change an auth decision or expose a session.

| Category | Interpretation and next check |
| --- | --- |
| `malformed_cookie`, `session_invalid` | Session input is malformed or invalid; no account access is granted |
| `session_expired`, `session_revoked`, `account_disabled` | Credential/account rejection; distinguish these from dependency outages |
| `firebase_configuration` | Check server credential/project provisioning; setup or recognized credential errors occurred |
| `firebase_unavailable` | Recognized network, timeout, internal-service, or rate-limit error; inspect Firebase health and verification timing |
| `firebase_failure` | Unrecognized Firebase failure; inspect provider-side diagnostics without copying credentials into app logs |
| `database_configuration` | Recognized database credential, database, URL, schema-configuration, or permission setup error |
| `database_unavailable` | Recognized connection, timeout, closed-connection, or pool-exhaustion error; compare database-stage timing and pool health |
| `database_conflict` | Unique account-link conflict; the exchange preserves its existing 409 response |
| `database_failure` | Other database operation failure; `stage` distinguishes lookup, email sync, and provisioning |
| `identity_email_missing`, `domain_user_missing` | Verified identity lacks the required email/account mapping; inspect provisioning |
| `unexpected_failure` | Failure outside a recognized dependency call; inspect completion code using the correlation ID |

Known SDK codes are mapped to these fixed categories; unknown codes/messages,
stacks, error causes and SDK response objects are never copied. Auth events omit
cookies, ID/session tokens, authorization headers, decoded claims, names, emails,
user/Firebase IDs, IPs, URLs, request bodies, and service-account/database secrets.
Existing ORM/provider/platform logging has its own policy and is not made safe
by this emitter. Restrict access and retention for operational logs as usual.

The existing development fallback remains conditioned on `NODE_ENV` and must not
be used to validate production security. Its event retains the original failure
category and explicitly reports `development_fallback`, so an unavailable
database cannot look like a normal successful lookup. Production never takes
that fallback. The session exchange still issues no cookie when production
verification, provisioning, or cookie creation fails.

## Validation and live exercise

```bash
pnpm exec vitest run src/lib/auth/session.test.ts src/lib/auth/request-resolution.test.ts src/app/api/auth/session/route.test.ts src/proxy.test.ts
AUTH_DIAGNOSTICS=1 NODE_ENV=production node --conditions=react-server tests/auth/request-resolution.mjs
```

The tests use actual auth/route source, real Next response/cookie/matcher behavior,
and the real React Server Component renderer/cache. Firebase and Prisma remain
controlled external boundaries; no credentials, live vendors, or real database
are needed. Coverage includes expected credential denials, setup/network/read/
sync/upsert/cookie errors, unknown sensitive error content, fallback visibility,
logging failure, response status/cookie safety, unique IDs, spoofed-header
replacement, asset exclusions, concurrent renders, and one lookup per render.

For deployment verification, use a disposable Preview environment and test
accounts. Record the `x-request-id` from an authenticated document/API response,
then locate the matching auth timing event with `AUTH_DIAGNOSTICS=1`. Revoke or
expire a test session and confirm rejection with its own matching diagnostic.
Induce a controlled dependency failure in Preview and confirm the stage/category,
generic existing client response, and absence of a session cookie. Check that
no credential/account data appears in auth events, then disable successful-event
logging after sampling. Automated results do not establish live Firebase health,
production latency, or log-collector delivery guarantees.

For this implementation, all 544 regular tests (including 58 focused auth/Proxy
checks), typechecking, ESLint, Prisma validation, and the production build passed.
Local validation used Node 24.9.0; the project requires 22.x and CI uses Node 22.x.
A local production server with credentials explicitly disabled returned 401 for
session lookup and 503 for session creation, issued no session cookie, replaced
the supplied request ID, and emitted exactly one matching redacted auth event
per failed operation. A normal guest remained quiet. No live Firebase, database,
production configuration, or production deployment was exercised or changed.
