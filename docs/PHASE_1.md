# TaskHive Phase 1: Planning, SRS, and Wireframes

## Goal
Finalize the planning foundation for TaskHive before implementation starts. Phase 1 should make the product idea, architecture, modules, user flows, and wireframe scope clear enough that the team can divide work without guessing.

## Phase 1 Deliverables
- Completed SRS: `docs/SRS.md`
- Architecture plan: `docs/ARCHITECTURE.md`
- Main user flows: `docs/Design Guidelines/USER_FLOWS.md`
- Figma wireframe guide: `docs/Design Guidelines/WIREFRAME_PLAN.md`
- Team task assignment: `docs/TEAM_TASKS.md`

## Locked Product Decisions
- TaskHive is a community-based local errands marketplace.
- One account can act as both Poster and Tasker.
- Users can view both `Tasks I Created` and `Tasks I Applied To`.
- Posters can create bidding-mode or fixed-price tasks.
- Chat is available before hiring.
- Poster approves the Tasker before payment.
- Poster pays when hiring is confirmed.
- Payment is held in a simulated escrow-style status until completion.
- Tasker marks the task complete.
- Poster confirms completion.
- Poster and Tasker can review each other after completion.
- Admin is global for the whole web app, not per community.

## Phase 1 Task Checklist
| Task | Owner | Status |
| --- | --- | --- |
| Finalize SRS requirements | Team | Done |
| Confirm roles and permissions | Team | Done |
| Finalize page inventory | Frontend/UI | Done |
| Create architecture plan | Backend/API | Done |
| Create user-flow diagrams | Team | Done |
| Create Figma wireframe plan | Frontend/UI | Done |
| Decide recommended tech stack | Team | Done |
| Assign modules to members | Team lead | Ready |
| Create Figma wireframes | Frontend/UI | Next |

## Phase 1 Acceptance Criteria
- The team can explain what TaskHive is in one paragraph.
- The team can identify the user roles and what each role can do.
- The team can explain how the project satisfies API/Data, Middleware/Cloud, and Security/QA requirements.
- The team has a page list for Figma.
- The team has a main user journey from signup to review.
- The team has a technical architecture that is realistic for a school project.
- The team has a task assignment plan for implementation.

## Recommended Next Step
Create the Figma wireframes using `docs/Design Guidelines/WIREFRAME_PLAN.md`, starting with the core marketplace flow:

1. Landing page
2. Sign up/login
3. Profile setup
4. Dashboard
5. Create task
6. Browse task
7. Task detail
8. Chat
9. Submit bid/request
10. Approve Tasker
11. Payment confirmation
12. Active task
13. Completion confirmation
14. Review
15. Admin dashboard
16. Reports/disputes
