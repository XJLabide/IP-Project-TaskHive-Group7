---
status: accepted
---

# Completion timers and blind review publication

Completion evidence belongs to the `Assignment`. The assigned Tasker submits it while the assignment is `ACTIVE`; local work requires a note and accepts an optional photo or receipt, while remote work requires a deliverable link. Submission records `completedAt`, sets `autoReleaseAt` to 48 hours later, and moves the task to `AWAITING_CONFIRMATION`. The selected payout stays unreleased.

The Poster can confirm, which releases the payout and completes the task, or either participant can open one `Dispute`, which moves the task, assignment, and payment to `DISPUTED` and freezes the payout for Admin review. Release paths only accept a `PAID_PENDING_COMPLETION` payment and an `AWAITING_CONFIRMATION` task inside the transaction, so a refunded payment or a concurrently opened dispute cannot be overwritten by a late confirmation or auto-release.

Three jobs drive the clock through `POST /api/jobs` (QStash in production):

- `completions.send_reminders` sends one Poster reminder once 24 hours have passed. `reminderSentAt` is written before the notification and cleared if the write fails, so the single reminder can retry.
- `completions.auto_release` releases undisputed payouts 48 hours after submission. It re-checks for an open dispute inside the transaction.
- `reviews.publish_due` reveals reviews whose 14-day blind window elapsed.

Reviews unlock when the task is `COMPLETED`. Each participant submits once; the review row is hidden (`publishedAt` null) until both participants submit or `publishAt` (14 days after payout release) passes. The second submission publishes both rows in one transaction. Concurrent duplicate submissions are rejected by the unique constraint and mapped to a coded failure rather than a server error.

Dispute resolution (full refund, partial payout, or full payout) is owned by the Admin support milestone; until an Admin decides, the task remains frozen and review publication is skipped because the task is not `COMPLETED`.
