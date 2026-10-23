# TaskHive Software Requirements Specification

**Status:** Product direction approved; implementation details and provider eligibility remain subject to validation.
**Last updated:** 2026-10-23

## 1. Purpose and product direction

TaskHive is a production-ready marketplace for adults across the Philippines to post and complete local services and a curated set of remote tasks. One account can act as both Poster and Tasker. Guests can browse public tasks, while signing in and meeting the relevant account gates is required to act.

This SRS defines the intended first production release. The current repository is a frontend prototype with static/local data and no connected marketplace backend; screens or interactions in the prototype do not imply that production authentication, payments, verification, messaging, or persistence are already implemented.

### 1.1 First-release outcome

The first production release must complete the core marketplace loop—discover, post, apply, select one Tasker, pay through a provider, complete, resolve support issues, and review—alongside the trust and support functions needed to operate it. Admin v1 includes reports, disputes, verification exceptions, and basic user/task oversight. Advanced analytics and category management are deferred.

### 1.2 Supporting documents

- `GLOSSARY.md`: agreed product terms.
- `docs/Design Guidelines/USER_FLOWS.md`: user journeys and lifecycle branches.
- `docs/Design Guidelines/WIREFRAME_PLAN.md`: screens to design.
- `docs/PHASE_1.md`: planning and wireframe checklist.
- `docs/ARCHITECTURE.md`: provisional implementation architecture; provider selection is not final.
- `docs/adr/`: accepted product decisions and rationale.

## 2. Scope

### 2.1 In scope for the first production release

- Public browsing of tasks and marketplace information.
- Account creation, sign-in, verified email and phone, 18+ attestation, and a basic profile.
- A single account that can post and task, with Tasker identity verification before assignment.
- Local tasks across the Philippines and curated remote tasks.
- Separate fulfillment mode (local or remote) and hiring mode (bidding or fixed-price).
- Task creation, browsing, search, filters, task-scoped pre-application chat, bids/requests, withdrawal, manual Poster selection, and assignment.
- Provider checkout at hire, provider-managed payout after completion, provisional 5% fee deducted from Tasker payout, refunds, and payment status history.
- Completion evidence, confirmation, reminders, auto-release, disputes, cancellation review, and two-way reviews.
- In-app inbox and email for key marketplace events.
- Global Admin tools for reports, disputes, verification exceptions, and basic user/task oversight.

### 2.2 Launch categories and boundaries

Local categories: errands, delivery, cleaning, repairs, moving, and tutoring. Remote categories: tutoring, writing, design, and translation. Medical and childcare services, passenger transport, and hazardous or regulated work are excluded at launch unless appropriate credentials and operating policies are introduced. Category eligibility must be enforced by the product, not only stated in these documents.

Native mobile apps, multiple Taskers per task, advanced analytics, category management, subscriptions, AI matching, and regulated/high-risk categories are outside first-release scope.

### 2.3 Decisions and dependencies not yet final

- PayMongo is the first payment provider to evaluate. It is not selected or approved. Before implementation, confirm platform eligibility and support for delayed payout, refunds, disputes, and marketplace routing. Do not describe the flow as legal escrow.
- The 5% platform fee is provisional and must be validated before launch.
- Authentication, database, hosting, maps, email, storage, and queue vendors in `docs/ARCHITECTURE.md` are implementation proposals unless explicitly confirmed there as implemented.
- Legal, tax, consumer-protection, privacy, identity-verification, and payment-provider requirements for a nationwide Philippine launch require qualified review before production.

## 3. Users and access rules

| User | Capabilities and restrictions |
| --- | --- |
| Guest | Browse public tasks and platform information; may register or sign in. Cannot chat, apply, post, or access private account pages. |
| Registered participant | One account may be Poster and Tasker. Before posting or applying: name, verified email, verified phone, and 18+ attestation. |
| Poster | Create and manage own tasks, review applications, manually select one Tasker, pay at hire, confirm completion, request cancellation, report, dispute, and review. |
| Tasker (pending verification) | Browse and submit bids or fixed-price requests. Applications are marked pending verification and cannot be approved. |
| Identity-verified Tasker | May be assigned, perform work, submit completion evidence, request cancellation, report, dispute, and review. Multiple active assignments are allowed; there is no platform hard limit. |
| Verification-rejected Tasker | Browse only; may make one Admin appeal. Existing applications are withdrawn and Posters are notified. If the appeal succeeds, the Tasker must submit new applications. |
| Admin | Global platform operator for reports, disputes, verification exceptions, and basic user/task oversight. Admin decisions and consequential actions must be recorded. |

Identity documents are collected and retained by the verification provider. TaskHive stores the verification status and provider reference needed to enforce the assignment gate and handle exceptions.

## 4. Marketplace rules

### 4.1 Tasks and discovery

- Every task has one fulfillment mode and one hiring mode; these are independent choices.
- A local task has a service location. Taskers see the approximate area before hire; the exact address is revealed only after payment succeeds and the assignment becomes active.
- Taskers choose a map/search origin and radius for local discovery. The default is 10 km around the saved location. Remote tasks do not require a physical service location.
- Public task browsing does not require sign-in. Applying, posting, and chat require sign-in and the applicable account gates.
- A task is assigned to exactly one Tasker. Posters select manually in both hiring modes; there is no auto-approval.

### 4.2 Applications and task edits

- Bidding tasks accept bids; fixed-price tasks accept requests at the Poster’s listed price. The Poster manually selects one applicant.
- A Tasker may withdraw a bid/request until assignment.
- If the Poster changes a material field (title/scope, budget, deadline, service location, fulfillment mode, or hiring mode), all current applications are cleared and affected Taskers are notified.
- After a Poster selects a Tasker, reserve the selected Tasker and task for 24 hours while payment is retried. Keep other applications pending and prevent new applications during the hold. If unpaid at expiry, reopen the task and retain the other pending applications.
- Deleting a draft is allowed. A published task is cancelled rather than deleted; its task, applications, payment, and support history are retained.

### 4.3 Chat and notifications

- A signed-in user may start a task-specific conversation with the Poster before applying, while the task is open.
- Only conversation participants and authorized Admins handling a report/dispute may access messages. Chat must support reporting inappropriate messages.
- Key events (applications, chat, payment, completion, disputes, and support decisions) appear in an in-app inbox; key events are also emailed.

## 5. Payment, completion, and support lifecycle

1. The Poster manually selects one Tasker.
2. The task and selected Tasker enter the 24-hour payment retry hold.
3. The Poster completes provider checkout. On success, the assignment activates and the Tasker receives the exact local address when applicable.
4. The provider manages routing of the Poster’s payment and Tasker payout. TaskHive records provider references and safe status metadata. The 5% provisional platform fee is deducted from the Tasker payout.
5. The Tasker completes the work. For local work, submit a completion note; a photo or receipt is optional. For remote work, submit the deliverable.
6. The Poster confirms completion, or either party opens a dispute before payout release. A dispute freezes payout for Admin review.
7. If the Poster has not confirmed or disputed within 24 hours, send one reminder. If no dispute exists, release payout automatically 48 hours after completion was submitted. Auto-release completes the task and unlocks reviews.
8. After completion/auto-release, both participants may submit a review. Reviews stay hidden until both submit or 14 days pass, then become public.

Either party may request cancellation after hire. Work and payout pause while Admin reviews the evidence. Admin should complete review within two business days and decide on a full refund, partial payout, or full payout according to evidence of work completed. A cancellation request is distinct from a completion dispute, but both freeze the relevant work/payment action pending review.

## 6. Functional requirements

### 6.1 Accounts and profiles

- **FR-001** The system shall allow a guest to browse public task listings and public task details.
- **FR-002** The system shall support account creation and sign-in.
- **FR-003** One account shall be able to act as Poster and Tasker.
- **FR-004** Before posting or applying, a participant shall have a name, verified email, verified phone, and 18+ attestation.
- **FR-005** The system shall require Tasker identity verification before assignment, while permitting pending Taskers to browse, bid, and request tasks.
- **FR-006** The system shall store verification status/reference, not identity-document images, as the platform’s verification record.
- **FR-007** The system shall allow one Admin appeal after verification rejection and support exception review.
- **FR-008** The system shall show tasks created, applications, assignments, messages, and relevant account/verification state in the signed-in experience.

### 6.2 Tasks and discovery

- **FR-009** Posters shall be able to save drafts, publish tasks, edit open tasks, and cancel published tasks they own.
- **FR-010** A task shall specify title/scope, category, budget or fixed price, deadline, fulfillment mode, hiring mode, and the fields required for that task type.
- **FR-011** The system shall expose only launch-approved categories and reject excluded categories unless an authorized policy change enables them.
- **FR-012** Users shall be able to search and filter public tasks by relevant keywords, category, budget, deadline, fulfillment, hiring mode, and local area.
- **FR-013** Local discovery shall support a chosen origin and radius with a 10 km default around the saved location.
- **FR-014** The system shall hide exact local service addresses from unassigned users and reveal them to the assigned Tasker only after successful payment and assignment activation.
- **FR-015** Material edits shall clear existing applications and notify the affected Taskers.
- **FR-016** Published task history and related applications/support records shall remain available after cancellation; unpublished drafts may be deleted.

### 6.3 Applications, selection, and chat

- **FR-017** Verified or pending-verification Taskers who pass the basic action gate shall be able to bid on bidding tasks and request fixed-price tasks.
- **FR-018** Applications from pending-verification Taskers shall be visible to Posters as pending and shall not be approvable.
- **FR-019** Posters shall manually select exactly one Tasker; the system shall not auto-approve or assign more than one Tasker to a task.
- **FR-020** Taskers shall be able to withdraw their application before assignment.
- **FR-021** Following selection, the system shall reserve the task/selected Tasker for a 24-hour payment window, preserve other pending applications, and reopen the task with those applications if the window expires unpaid.
- **FR-022** Signed-in users shall be able to start or continue a task-scoped chat with the Poster while the task is open, before applying.
- **FR-023** Chat access shall be restricted to participants and authorized support review; users shall be able to report messages.

### 6.4 Payments, completion, reviews, and support

- **FR-024** The system shall initiate provider checkout after Poster selection and activate assignment only after successful payment.
- **FR-025** The system shall record safe payment, fee, payout, refund, and provider-reference metadata without storing card credentials or claiming legal escrow.
- **FR-026** The system shall calculate the provisional 5% fee from task price and deduct it from the Tasker payout, with the rate configurable pending launch approval.
- **FR-027** The assigned Tasker shall submit a local completion note (optional photo/receipt) or remote deliverable.
- **FR-028** The Poster shall be able to confirm completion; either party shall be able to dispute before payout release.
- **FR-029** The system shall send one reminder 24 hours after completion submission when the Poster has not acted.
- **FR-030** If no dispute is opened, the system shall auto-release payout 48 hours after completion submission and unlock reviews.
- **FR-031** Either party shall be able to request post-hire cancellation; work and payout shall pause pending Admin review within two business days.
- **FR-032** Admin shall resolve cancellation/dispute payment based on evidence, including full refund, partial payout, or full payout, and record the decision.
- **FR-033** Both task participants shall be able to review after completion/auto-release; reviews shall be hidden until both submit or 14 days pass.

### 6.5 Admin and notifications

- **FR-034** The system shall provide a global Admin queue for reports, disputes, verification exceptions, and basic user/task oversight.
- **FR-035** Admin actions and support decisions shall be auditable.
- **FR-036** The system shall deliver key events to an in-app inbox and email.
- **FR-037** Advanced analytics and category management shall not be required for the first release.

## 7. Non-functional requirements

- **NFR-001 Security:** Authenticate private actions and enforce participant, task ownership, assignment, and Admin authorization on the server.
- **NFR-002 Privacy:** Minimize sensitive data. Do not store identity documents or payment credentials in TaskHive. Protect exact service addresses and chat content.
- **NFR-003 Reliability:** Enforce one assignment per task, idempotent payment callbacks, safe retry behavior, and auditable payment/support status histories.
- **NFR-004 Accessibility/usability:** Support responsive desktop and mobile web, keyboard operation, clear validation, and understandable status/error messages.
- **NFR-005 Performance:** Public discovery and common marketplace actions should remain responsive at expected launch scale; background notifications must not block them.
- **NFR-006 Maintainability:** Separate marketplace rules, persistence, external providers, and presentation. Keep provider integrations replaceable behind explicit boundaries.
- **NFR-007 Operations:** Monitor failed payment callbacks, notification jobs, verification callbacks, and support-review deadlines; provide retry or escalation paths.
- **NFR-008 Compliance readiness:** Complete qualified review of privacy, consumer, payment, tax, and safety obligations before production launch.

## 8. Core domain records

The production data model is expected to represent at least users/profiles, verification state/reference, tasks, categories, bids/requests, task conversations/messages, assignments, payment attempts, payment/payout/refund records, reviews, notifications, reports, disputes/cancellation requests, and Admin actions. Exact tables and storage products are architecture decisions, not product requirements.

The model must preserve task and payment history, exact-address access rules, application invalidation on material edits, the payment retry hold, verification gating, and review visibility timing.

## 9. Acceptance scenarios

1. A guest can browse tasks, but must sign in and complete basic profile gates before posting or applying.
2. A pending Tasker can apply, the Poster sees the application as pending verification, and cannot select that Tasker.
3. A verified Tasker can apply; the Poster manually selects one person. Payment success activates the assignment; a payment failure keeps the selected pair on hold for up to 24 hours.
4. If payment hold expires, the task reopens and other pending applications remain. A material edit clears applications and notifies their authors.
5. The exact local address is hidden before successful payment/active assignment and visible to the assigned Tasker afterward.
6. Either party may request cancellation after hire; work and payout pause while Admin reviews. Admin records an evidence-based outcome within the target window.
7. Completion evidence differs by fulfillment: note for local, deliverable for remote. Poster can confirm; either party can dispute before release; no response leads to reminder at 24 hours and auto-release at 48 hours if undisputed.
8. Reviews unlock after confirmation or auto-release and remain hidden until both submit or the 14-day window expires.
9. A published task is cancelled and retained; only an unpublished draft is deleted.
10. Admin v1 can review reports, disputes, verification exceptions, and basic user/task records, with auditable decisions.

## 10. Current prototype boundary

The current web app is a static frontend prototype. Until a backend project is explicitly started, treat local/static interactions as demonstration behavior only. Do not represent them as durable accounts, secure identity checks, real provider payments/payouts, persistent support cases, or production notifications. The UI should progressively reflect the decisions in this SRS, but backend acceptance must be verified against the production scenarios above.
