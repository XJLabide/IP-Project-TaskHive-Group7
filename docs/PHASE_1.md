# TaskHive Phase 1: Product Direction and Wireframes

## Goal
Give the team one agreed description of the production marketplace and its core journeys before expanding the current static frontend prototype into a connected product.

## Source of truth
- Product and system requirements: `docs/SRS.md`.
- User journeys and lifecycle branches: `docs/Design Guidelines/USER_FLOWS.md`.
- Domain language: `GLOSSARY.md`.
- Accepted product decisions: `docs/adr/`.
- Proposed technical approach: `docs/ARCHITECTURE.md` (vendors remain provisional unless marked implemented).

## Locked product direction
- Production-ready, nationwide Philippines marketplace for adults.
- Guests browse publicly; account actions require a basic profile and verified email plus 18+ attestation.
- One account supports Poster and Tasker roles; stronger Tasker identity verification is required before assignment.
- Local and curated remote fulfillment are supported; fulfillment and hiring are separate choices.
- Bidding and fixed-price requests both use manual Poster selection of exactly one Tasker.
- Provider-managed payment and payout, with PayMongo evaluated first but not yet selected or confirmed.
- Completion, cancellation, dispute, review, privacy, notification, and Admin rules are specified in the SRS and user flows.
- The repository currently contains a static frontend prototype and has no connected marketplace backend.

## Phase 1 deliverables
- [x] Product direction and launch boundaries recorded.
- [x] SRS updated with requirements and acceptance scenarios.
- [x] User flows updated for primary paths and edge cases.
- [x] Domain glossary and key decision records created.
- [ ] Review technical architecture against selected provider and production constraints.
- [ ] Align Figma wireframes with the approved flow and page inventory.

## Acceptance criteria
- A teammate can explain the target market, users, launch categories, and prototype boundary without guessing.
- The team can trace public discovery through selection, provider payment, completion, support, and review.
- Verification gating, local-address privacy, application invalidation, payment retry, cancellations, disputes, and review timing are unambiguous.
- All proposed external providers and unresolved launch dependencies are identified as provisional.
- Figma screens use the SRS and user flows as the source of truth.

## Next steps
1. Update Figma wireframes for the approved flows, starting with browse, task detail, create task, application review, and payment.
2. Validate PayMongo marketplace eligibility and required payout/refund/dispute capabilities before choosing a provider.
3. Plan the production backend only after architecture, compliance review, and integration constraints are confirmed.
