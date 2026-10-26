# TaskHive Team Task Assignment

## Suggested Team Roles
Use this assignment if the team has five members:

| Role | Main Responsibility |
| --- | --- |
| Frontend/UI Lead | Wireframes, page layouts, frontend screens, user navigation. |
| Backend/API Lead | REST API routes, services, controllers, validation, auth middleware. |
| Database Lead | Schema, models, relationships, seed data, status fields. |
| Integrations Lead | Payment-provider evaluation, maps, message broker, notifications. |
| QA/Admin Lead | Admin module, reports/disputes, CI, tests, demo validation. |

If the team has three members:

| Member | Responsibility |
| --- | --- |
| Member 1 | Wireframes, frontend pages, profile/dashboard/task screens. |
| Member 2 | Backend API, database, authentication, task marketplace logic. |
| Member 3 | Payment-provider evaluation, Maps, message broker, admin, QA, CI. |

## Phase-by-Phase Work Split

### Phase 1: Planning, SRS, and Wireframes
- Frontend/UI: Figma pages and reusable wireframe components.
- Backend/API: Architecture plan and API endpoint review.
- Database: Entity list and relationship review.
- Integrations: Confirm free/demo integrations.
- QA/Admin: Acceptance criteria and test scenario review.

### Phase 2: Project Setup and Foundation
- Frontend/UI: Create frontend project and routing shell.
- Backend/API: Create backend project and base API structure.
- Database: Connect SQL database and create first schema.
- Integrations: Configure environment variable structure for selected services only after the provider/vendor choices are confirmed.
- QA/Admin: Configure CI pipeline.

### Phase 3: Authentication, Profiles, and Roles
- Frontend/UI: Auth screens, profile setup, profile edit.
- Backend/API: Register, login, JWT, protected middleware.
- Database: Users and profiles tables.
- QA/Admin: Auth tests and admin permission tests.

### Phase 4: Task Marketplace Core
- Frontend/UI: Create task, browse tasks, task detail, bid screens.
- Backend/API: Task, bid, request, hiring endpoints.
- Database: Tasks, bids, requests, assignments.
- QA/Admin: Marketplace flow tests.

### Phase 5: Chat and Notifications
- Frontend/UI: Chat inbox, conversation, notification center.
- Backend/API: Chat and notification endpoints.
- Database: Chat and notification storage.
- Integrations: Message broker jobs.

### Phase 6: Maps and Location Features
- Frontend/UI: Location picker, map display, nearby tasks.
- Backend/API: Location fields and nearby task query.
- Database: Task location data.
- Maps: Leaflet with OpenStreetMap tiles; map clicks set task pins and search origins, and Photon provides private-address autocomplete through the server route.

### Phase 7: Payments, Completion, and Reviews
- Frontend/UI: Payment confirmation, completion, reviews, earnings.
- Backend/API: Provider checkout/payout boundary, payment status, completion, reviews.
- Database: Payments, payouts, reviews.
- Integrations: Evaluate PayMongo marketplace eligibility and required capabilities; do not assume approval or implement until confirmed.
- QA/Admin: Payment and review tests.

### Phase 8: Reports, Disputes, and Admin
- Frontend/UI: Admin screens, reports, disputes.
- Backend/API: Admin, report, dispute endpoints.
- Database: Reports, disputes, admin actions.
- QA/Admin: Admin authorization and moderation tests.

### Phase 9: QA, Polish, and Presentation Prep
- Whole team: Fix bugs, test demo flow, prepare screenshots, prepare demo accounts.

## First Implementation Priority After Phase 1
Start with:

1. Project setup.
2. Database schema.
3. Authentication.
4. User profiles.
5. Task creation and browsing.

Do not start payment-provider integration, Maps, or Admin dashboards before the basic marketplace flow works and the required service capabilities are confirmed.
