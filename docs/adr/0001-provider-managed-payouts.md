---
status: accepted
---

# Use provider-managed task payments and payouts

TaskHive will collect the Poster’s payment through a payment provider at hire and use provider-supported funds routing to pay the Tasker after completion is confirmed. For a nationwide Philippines launch, evaluate PayMongo first; this is an evaluation direction, not a final provider selection, and approval plus support for the required hold, refund, dispute, and payout flow must be confirmed. Stripe test mode was proposed in an earlier SRS revision, but is not a confirmed production provider for a Philippines-based platform. Local completion requires a Tasker note with optional photo/receipt; remote completion requires a deliverable. The Poster gets a reminder at 24 hours. Either party may dispute before the 48-hour auto-release; an open dispute freezes payout for Admin review. If no dispute is opened, auto-release after 48 hours also unlocks reviews. The initial platform fee is provisionally 5% of the task price and is deducted from the Tasker’s payout. Either party may request cancellation after hire; work and payout pause while Admin reviews evidence and decides on a full refund, partial payout, or full payout. TaskHive will not represent this as legal escrow.

Current provider references: [Stripe country availability](https://stripe.com/global) and [PayMongo marketplace payout workflow](https://docs.paymongo.com/docs/fiaas-workflows).
