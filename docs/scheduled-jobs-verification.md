# Scheduled job verification

## Boundary

The recurring marketplace jobs — payment-hold expiry, completion reminders, payout auto-release, and review publication — are invoked through the signed `POST /api/jobs` endpoint. QStash delivers them on a recurring schedule; the endpoint rejects any request whose signature cannot be verified against `QSTASH_CURRENT_SIGNING_KEY` or `QSTASH_NEXT_SIGNING_KEY`.

Provisioning and monitoring live behind the admin-only `/api/admin/jobs` route. The schedule registry in `src/lib/queue/schedules.ts` is the source of truth for cadence and retries; `src/lib/queue/monitor.ts` computes the backlog each job would pick up.

## Automated coverage

- `src/lib/queue/schedules.test.ts` verifies schedule provisioning (create missing, skip matching, report cron drift, collect per-schedule failures, handle base64 bodies) and status mapping (last success/failure states, next run, paused).
- `src/lib/queue/monitor.test.ts` verifies the backlog counts use the same filters as the jobs that drain them, including the 24-hour reminder cutoff.
- `src/app/api/admin/jobs/route.test.ts` verifies admin-only access, merged status/backlog reads, and the 503 response when QStash is not configured.
- `src/app/api/jobs/route.test.ts` already verifies the signed route rejects unsigned payloads and dispatches the email job by name; the four recurring jobs are covered by their service tests in `src/lib/completion/service.test.ts` and `src/lib/payments/service.test.ts`.

## Provisioning exercise (requires QStash credentials)

1. Set `QSTASH_TOKEN`, `QSTASH_DESTINATION_URL`, `QSTASH_CURRENT_SIGNING_KEY`, and `QSTASH_NEXT_SIGNING_KEY` in the target environment.
2. As an admin, call `POST /api/admin/jobs`. Expect a 200 whose `data` lists four `created` schedules and empty `drifted`/`failures`.
3. Call `GET /api/admin/jobs`. Every schedule should report its `scheduleId`, an `actualCron` matching `expectedCron`, and `isPaused: false`.
4. Re-run `POST /api/admin/jobs`. It should now `skipped` all four (idempotent) rather than creating duplicates.

## Overdue-job and retry exercise (requires a configured database)

Use two verified accounts against the same environment, plus a local clock or short-lived data, to confirm each job drains its backlog exactly once.

1. **Hold expiry.** Poster selects a Tasker, leaving the task `PENDING_PAYMENT`. Force the `Assignment.holdExpiresAt` into the past (or wait). Trigger `POST /api/jobs` with `{"jobName":"assignments.expire_holds"}` signed with the current key. The assignment becomes `EXPIRED`, the task reopens to `OPEN`, and the accepted bid/request returns to `SUBMITTED`. Re-running returns `expired: 0`.
2. **Completion reminder.** With an `ACTIVE` assignment, submit completion and force `completedAt` to 24+ hours ago. Trigger `completions.send_reminders`. Exactly one reminder is recorded (`reminderSentAt` set); re-running sends nothing further.
3. **Auto-release.** Force `autoReleaseAt` into the past on an undisputed `AWAITING_CONFIRMATION` task. Trigger `completions.auto_release`. The payment moves to `RELEASED`, the payout's `releasedAt` is set, and the task/assignment complete. A task with an open dispute is skipped.
4. **Review publication.** Create a completed task, submit one review, and force the review's `publishAt` into the past. Trigger `reviews.publish_due`. The single blind review becomes `publishedAt`-set and visible to the counterpart.
5. **Email retry.** Deliver an email for a `PENDING` notification with a verified email address and confirm `deliverNotificationEmail` records `SENT`. With a missing app URL or an email provider that rejects the message, it records `FAILED` and throws so QStash retries the same notification ID (the Resend idempotency key keeps retries single-delivery); an unverified or missing email records `SKIPPED` instead.

After each run, `GET /api/admin/jobs` should show the corresponding backlog count drop to zero and the schedule's `lastScheduleStates` record a `SUCCESS` (or `FAIL`, which surfaces in QStash's failure queue for retry).

Do not use real payment credentials for this exercise. The exercise can be run locally by signing requests with the QStash dev-server keys or the configured signing keys; production provisioning should be performed only by an admin in the target environment.
