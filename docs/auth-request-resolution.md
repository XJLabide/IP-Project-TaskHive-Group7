# Request-scoped authentication resolution

Issue: [#62](https://github.com/XJLabide/IP-Project-TaskHive-Group7/issues/62).

## Measurement and change

At base commit `7043437`, root and profile layouts already called the same
React-cached `loadCurrentActor`. That avoided duplicate Firebase verification
between those layouts, but actor loading still did two Prisma User lookups:
Firebase UID to session user, then user ID to authorization fields. A separate
session reader in the same render repeated verification and the session lookup.

The implementation shares a verified account context between session and actor
readers. The Firebase UID lookup selects the session and gate fields together,
then maps them into separate DTOs. `loadActorById` retains its fresh query for
explicit post-mutation reads. No database migration or UI change is required.

The test fixture renders the actual root/profile layouts, page consumers, and
page guard through Next's bundled React Server Component renderer. It uses the
real React.cache implementation. Only external boundaries (Firebase, Prisma,
request headers, redirects) and unrelated presentation dependencies are replaced.

Before/after observations from the same local harness:

| Render path | Before: verifications / user lookups | After: verifications / user lookups |
| --- | --- | --- |
| Root + profile + repeated page actor reads + guard | 1 / 2 | 1 / 1 |
| Same render plus session-only reader | 2 / 3 | 1 / 1 |
| Next request with the same cookie | 1 / 2 | 1 / 1 |

With a controlled 5 ms delay at each Firebase verification and Prisma User read,
one warm-render sample changed from 16.72 ms to 11.76 ms, and the mixed-reader
sample from 27.83 ms to 11.74 ms. These are synthetic boundary measurements,
not production navigation timings or live Firebase/PostgreSQL benchmarks. First
render includes renderer startup overhead. Assert operation counts, not elapsed
time: scheduler noise makes duration thresholds unreliable. A Prisma User lookup
including a relation may execute multiple SQL statements; the table counts
Prisma `user.findUnique` calls, not individual SQL statements.

Reproduce operation counts and inspect elapsedMs with:

```sh
NODE_ENV=production node --conditions=react-server tests/auth/request-resolution.mjs
pnpm exec vitest run src/lib/auth/request-resolution.test.ts
```

The fixture needs Node 22.15+ (synchronous module hooks) and the installed Next,
React, and TypeScript packages. It loads production application source after
registering boundary substitutions; no Firebase credentials or database are used.
Typechecking separately checks the TypeScript source compiled by the fixture.

## Security and failure behavior

- `verifySessionCookie(cookie, true)` retains Firebase revocation checking. It
  runs once for each authenticated render, even for a cookie seen in a previous
  request. Revoked/expired/invalid sessions fail closed.
- React.cache lives only for the current Server Component render. There is no
  process-wide Map, TTL, Next Data Cache, or persistent cookie/result storage.
  The cookie value is the key within that render, so separate Headers wrappers
  can share work. Credentials are never logged or returned by the measurement
  fixture.
- Root layout, nested layouts, pages, and guards see one verified account
  snapshot during that render. Account/admin/age/verification changes become
  visible on the next server request. Browser-preserved layouts do not replace
  API authorization; mutation routes still check the acting user independently.
- Outside React rendering, including Route Handlers, the cached resolver runs
  without memoization. The same Headers object is verified again on another
  call. Explicit `loadActorById` reads after a profile update remain uncached.
  `requireAdmin` retains its independent current-admin database check.
- Missing/malformed cookies skip verification. Missing accounts, production
  database failures, or failures synchronizing Firebase email state return no
  session/actor. Existing development-only database fallbacks stay confined to
  non-production; they are not suitable for deployment or security validation.
- The session DTO remains limited to its existing user fields. Age attestation
  and identity-verification details stay in the internal authorization snapshot.

Regression coverage includes concurrent renders for different users, repeated
requests, role promotion/demotion, verification rejection, revocation, missing
accounts/cookies, invalid cookies, production read/update failures, email-state
synchronization, session DTO shape, and fresh reads after mutation.

## Live verification

Use a test account and a disposable preview environment with real Firebase and
PostgreSQL when measuring live latency. Add temporary profiler spans around
Firebase verification and Prisma calls without logging cookies, headers, decoded
tokens, or personal data. Measure several cold and warm full `/profile` document
requests and client navigation requests, then remove the profiler spans. Compare
operation counts and the span distributions separately from total HTTP latency.
Repeat after revoking the Firebase session and after removing admin privileges;
the next server/API request must reject the revoked session or use the updated
permissions. Also update profile/verification fields and verify fresh responses.

Live-provider timing was not performed for this change. The automated exercise
covers the real React request-cache boundary with controlled external services.
