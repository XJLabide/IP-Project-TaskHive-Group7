# TaskHive User Flows

These flows describe the intended first production release. The current app is a static frontend prototype, so its local interactions do not imply a connected backend, real authentication, verification, or payment processing. Product terms are defined in `../../GLOSSARY.md`; requirements and acceptance scenarios are in `../SRS.md`.

## 1. Public browse and account access

```text
Guest
  -> Landing page or Browse Tasks
  -> Search/filter public tasks
  -> Public task detail (approximate area for local work)
  -> Sign up / Sign in to chat, post, bid, or request
```

Before posting or applying:

```text
Create account / Sign in
  -> Enter name and contact details
  -> Verify email and phone
  -> Attest age 18+
  -> Basic profile complete
  -> Enter marketplace dashboard
```

The same account supports Poster and Tasker activity. Skills and portfolio are optional/deferred for the first release. Public browsing remains available if a user has not signed in or a Tasker is restricted.

## 2. Create and publish a task

```text
Poster
  -> Create task
  -> Choose Local or Remote fulfillment
  -> Choose Bidding or Fixed-price hiring
  -> Choose an eligible launch category
  -> Enter title/scope, details, budget or price, deadline
  -> If Local: set service location and exact address
  -> Save draft or publish
  -> Task appears in public discovery
```

Local categories: errands, delivery, cleaning, repairs, moving, tutoring. Remote categories: tutoring, writing, design, translation. Medical/childcare services, passenger transport, and hazardous or regulated work are unavailable at launch unless an approved credential policy is added.

The Poster may delete a draft. After publication, the Poster may cancel it; task and application history remain. If the Poster changes title/scope, budget, deadline, local service location, fulfillment mode, or hiring mode, existing bids/requests are cleared and affected Taskers are notified.

## 3. Find tasks and choose a local search area

```text
Tasker
  -> Browse public tasks
  -> Select origin and radius for Local tasks
       default: 10 km around saved location
  -> Search/filter by category, keywords, price, deadline, mode, or area
  -> Open task detail
```

Remote tasks do not use a physical service location. Before hire, local task detail reveals only an approximate area. The exact address appears only to the selected Tasker after payment succeeds and the assignment activates.

## 4. Ask questions, then apply

```text
Signed-in user
  -> Open an open task
  -> Start task-specific chat with Poster (optional, before applying)
  -> Clarify scope
  -> If Bidding: submit bid with proposed price/message/estimated timing
     If Fixed-price: submit request at listed price with message/availability
  -> Track application in My Tasks / My Applications
```

The conversation is scoped to that task and available only while it is open. A Tasker may withdraw an application until assignment. Pending-verification Taskers may browse and apply; their application is visible as **Pending verification** and cannot be selected. A verification-rejected Tasker can browse only. They may file one Admin appeal; existing applications are withdrawn and their Posters notified. If approved on appeal, they must apply again.

## 5. Poster reviews applications and selects one Tasker

```text
Poster receives in-app + email update
  -> Open task application list
  -> Compare bids or fixed-price requests
  -> View Tasker profile and task chat
  -> Select one eligible, identity-verified Tasker
  -> Selected Tasker/task enter 24-hour payment retry hold
  -> Other applications stay pending; new applications are blocked
```

If payment succeeds during the 24-hour hold, the assignment activates. If payment is still unsuccessful at expiry, the selection clears, the task reopens, and other pending applications remain available. If the task is materially edited while open, applications are cleared instead and authors are notified.

## 6. Pay and activate assignment

```text
Poster
  -> Review task price and provisional 5% platform fee (deducted from Tasker payout)
  -> Checkout through the selected marketplace payment provider
  -> Payment succeeds
  -> Assignment activates
  -> Assigned Tasker receives exact local service address, if applicable
```

The provider is not selected yet. PayMongo is the first provider to evaluate; production implementation depends on eligibility and confirmation of the required marketplace payout, refund, and dispute capabilities. Do not call the flow legal escrow. Provider failure stays within the 24-hour retry hold.

## 7. Perform work and resolve completion

```text
Assigned Tasker performs task
  -> Local: submit completion note (photo/receipt optional)
     Remote: submit online deliverable
  -> Poster reviews evidence
     -> Confirm completion -> provider payout proceeds
     -> Either party disputes before release -> freeze payout for Admin review
     -> No action at 24 hours -> send one Poster reminder
     -> No dispute by 48 hours -> auto-release payout and complete task
```

After confirmation or undisputed auto-release:

```text
Poster and Tasker can submit reviews
  -> Keep each review hidden while the other party can submit
  -> Publish both when both submit, or publish submitted review(s) after 14 days
```

## 8. Request cancellation after hire

```text
Poster or Tasker requests cancellation
  -> Pause work and payout
  -> Notify both parties and create support case
  -> Admin reviews evidence and task/payment history (target: within 2 business days)
  -> Admin records full refund, partial payout, or full payout decision
  -> Notify both parties and close support case
```

## 9. Report, dispute, and Admin review

```text
User reports a person/task/message, or either party disputes completion/payment
  -> Create report or dispute with supporting context/evidence
  -> In-app inbox + email acknowledgment
  -> Admin queue: Reports / Disputes / Verification exceptions
  -> Admin reviews relevant task, messages, payment status, and evidence
  -> Admin records action and outcome
  -> Notify affected users
```

Disputes opened before payout release freeze payout. Admin v1 includes these support queues and basic user/task oversight; advanced analytics and category management are deferred.

## 10. Key state rules

| Event | Result |
| --- | --- |
| Pending Tasker applies | Application is visible but cannot be approved. |
| Verification rejected | Browse only; one appeal; existing applications withdrawn and Posters notified. |
| Poster selects eligible Tasker | 24-hour selected-tasker/payment hold; other applications stay pending. |
| Payment hold expires | Reopen task and retain other pending applications. |
| Material task edit | Clear all current applications and notify their authors. |
| Payment succeeds | Assignment activates; exact local address becomes visible to assigned Tasker. |
| Either party disputes completion | Freeze payout for Admin review. |
| No response after completion | Reminder at 24h; undisputed payout auto-releases at 48h. |
| Published task cancelled | Remove from active discovery; retain task and related history. |
