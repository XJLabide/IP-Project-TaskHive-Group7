# Marketplace persistence verification

## Data boundary

Outside local development preview mode, marketplace screens use same-origin authenticated APIs backed by Prisma/Postgres. The `?as=` viewer switch may preview the demo UI during local development only; it cannot route a production build to browser-local demo stores. Task lists and application/chat records are scoped on the server to the public task set or authenticated account. Public map pins are rounded to two decimal places; the raw stored coordinates and exact address are not returned in browse results. Exact addresses are returned only when the address-access policy allows the current Poster or paid, active Tasker to see them.

## Automated coverage

- Task authoring, lifecycle, application, chat, and payment services have focused tests for persistence behavior, ownership, participant access, and state transitions.
- API route tests cover authenticated account scoping for private task and dashboard reads.
- Marketplace client tests verify the API envelope and preserve server error codes/messages so screens can show actionable failures.
- Discovery projection tests assert that the exact address and raw coordinates stay private while browse data includes only an application count.

## Two-account verification exercise

Use two distinct, verified accounts in separate browser profiles against the same deployment or local environment with its database configured.

1. **Poster** creates and publishes a task. Reload the task page and the Poster’s `/tasks` workspace; the task should remain present. A second account must not see the draft.
2. **Tasker** browses the published task, opens its detail page, submits a bid or fixed-price request, and reloads. The application should remain visible in `/applications` to the Tasker.
3. **Poster** reloads the same task and sees the Tasker’s name, verification state, proposal, and amount. A third account must not see the application. The Poster selects the Tasker; both accounts should then see the task move into its payment hold.
4. **Tasker** opens a task conversation and sends a message. Reload both accounts’ task detail and `/chats`; both participants should see the same messages and a third account should receive an authorization failure.
5. **Poster** continues checkout only in a configured Maya sandbox environment. A completed provider payment should activate the assignment and unlock the exact address for the assigned Tasker. Production checkout remains disabled until the production payment readiness work is complete.
6. Restart the app or use a fresh browser profile. Tasks, applications, conversations, and confirmed payment state should still come from the database.

Do not use real payment credentials for this exercise. Maya sandbox transactions do not move real funds. The checkout API intentionally returns unavailable when the deployment is not configured for a non-production sandbox.

The automated suite verifies API and service behavior with isolated fixtures. The full two-account exercise above was not run during this implementation; it requires two authenticated accounts connected to the same database environment.
