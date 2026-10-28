# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Guests browse public tasks and marketplace information.
- Registered adults use one account as both Poster and Tasker.
- Posters publish tasks, review applications, select one Tasker, and manage payment and completion steps.
- Taskers browse, apply for work, complete assignments, and provide completion evidence.
- Admins handle reports, disputes, verification exceptions, and basic platform oversight.

## Product Purpose

TaskHive is a marketplace for adults across the Philippines to post and complete local services and a curated set of remote tasks. The first release aims to support the full marketplace loop from discovery and hiring through payment, completion, support, and reviews.

## Positioning

TaskHive combines local services and selected remote tasks in one marketplace where a participant can post work and complete work using the same account.

## Operating Context

- Local work is discovered by a chosen origin and radius; remote tasks do not need a physical location.
- Before hire, Taskers see an approximate local service area. Exact address access follows successful payment and assignment activation.
- Posters manually choose exactly one Tasker for both bidding and fixed-price tasks.
- TaskHive launches nationwide in the Philippines with both local and curated remote categories.

## Capabilities and Constraints

- Launch local categories: Errands, Delivery, Cleaning, Repairs, Moving, and Tutoring.
- Launch remote categories: Tutoring, Writing, Design, and Translation.
- Guests may browse; signing in and the applicable account checks are required to post, apply, or chat.
- Taskers may apply while identity verification is pending but cannot be assigned until verified.
- The SRS describes intended production behavior. In this checkout, marketplace records and workflows still use static or browser-local data, and no marketplace backend is connected.
- PayMongo is only the first payment provider to evaluate; it is not selected or approved. The 5% fee is provisional.
- Legal, privacy, consumer, tax, verification, and payment requirements need qualified review before production.

## Brand Commitments

- Use the TaskHive name and existing yellow brand accent.
- Signed-in workspace pages support both light and dark themes through the existing Theme toggle.

## Evidence on Hand

- `docs/SRS.md` records the approved product direction, launch scope, marketplace rules, and unresolved provider decisions.
- User-provided TaskHive dashboard and My Work screenshots guide those surfaces. They do not establish that pictured data or unsupported features exist in the product.
- Do not fabricate testimonials, metrics, marketplace activity, or provider capabilities.

## Product Principles

- Keep public task discovery open to guests while protecting account actions and personal task information.
- Support Poster and Tasker work in one account.
- Make hiring, payment, completion, and support decisions traceable and understandable.
- Preserve honest distinctions between the intended production SRS and currently connected behavior.

## Accessibility & Inclusion

- Support responsive desktop and mobile web layouts and keyboard-operable controls, consistent with the SRS non-functional requirements.

## Open Decisions

- Payment provider eligibility and payout support remain unconfirmed.
- The provisional 5% platform fee requires validation.
- Qualified review is needed for legal, tax, privacy, consumer-protection, verification, and safety requirements before launch.
