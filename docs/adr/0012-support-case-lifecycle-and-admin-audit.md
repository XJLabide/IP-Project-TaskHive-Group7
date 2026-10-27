---
status: accepted
---

# Support cases freeze work and leave an audit trail

After hire, either participant may request cancellation. The request moves the task to `CANCELLATION_REVIEW`, which pauses completion reminders, auto-release, and further payout movement while an Admin reviews the evidence. A cancellation request is separate from a completion dispute: the task can have one open cancellation or one open dispute, not both, and the request carries a `reviewDueAt` two business days after it was opened.

Admin decisions are explicit outcomes: `FULL_REFUND`, `PARTIAL_PAYOUT`, or `FULL_PAYOUT`. Full refund marks the payment `REFUNDED` and the task/assignment cancelled. Full payout releases the original net payout and completes the task. Partial payout releases an amount above zero and below the full net payout, records the remainder in `Payment.refundedCents`, and completes the task. Disputes use the same outcome model. Refunds are recorded as safe accounting metadata; the provider refund call stays behind the payment-provider boundary and is not implemented until a provider with refund support is selected.

Every consequential Admin action writes an `AdminAction` row in the same transaction as the state change; transition guards abort the transaction if the task, assignment, payment, or payout no longer matches the case. Verification appeal decisions require the acting Admin id and record the same audit row. The row records the Admin, action, target type/id, notes, and safe metadata (outcome, payout amount, task, payment). Verification appeal decisions use the same audit table. Reports stay separate from disputes: resolving a report updates only the report, optionally suspends the reported user, and never releases or refunds a payout.

Affected participants receive an in-app notification after a cancellation request or resolution. The Admin queue exposes open reports, disputes, cancellations, and verification appeals with review targets, recent tasks, and user/task totals; it never exposes chat content outside the report-review path. Admins can suspend or reinstate a non-Admin user through an audited action, while Admin accounts stay outside that queue.
