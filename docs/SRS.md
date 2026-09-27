# TaskHive Software Requirements Specification

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) describes the functional and technical requirements for **TaskHive**, a community-based task marketplace for local errands and everyday services. The document will guide system design, wireframing, development, testing, and project presentation.

### 1.1.1 Supporting Phase 1 Documents
The following documents support this SRS:

- `docs/PHASE_1.md`: Phase 1 checklist and deliverables.
- `docs/ARCHITECTURE.md`: Architecture plan and technology stack.
- `docs/Design Guidelines/USER_FLOWS.md`: Main user journeys.
- `docs/Design Guidelines/WIREFRAME_PLAN.md`: Figma page and screen checklist.
- `docs/TEAM_TASKS.md`: Team role and module assignment plan.

### 1.2 Project Background
TaskHive is similar to Fiverr, but instead of focusing mainly on digital freelance services, it focuses on local community tasks. Users can post errands or service requests, communicate with interested Taskers, approve a Tasker, pay for the task, confirm completion, and leave reviews.

### 1.3 Scope
The system will support:
- User registration, login, and profile verification.
- One account acting as both Poster and Tasker.
- Task posting, browsing, search, filtering, bidding, and fixed-price requests.
- Pre-hiring chat between Posters and Taskers.
- Hiring approval by the Poster.
- Stripe test-mode payment after hiring confirmation.
- Escrow-style payment status until Poster confirms completion.
- Task completion tracking.
- Two-way ratings and reviews.
- Reports, disputes, admin monitoring, and basic analytics.
- REST API, database operations, token-based authentication, message broker, external API integrations, and CI pipeline.

### 1.4 Out of Scope for Initial Version
- Native mobile app.
- Real legal escrow or real bank payout release.
- Complex identity verification such as government ID scanning.
- AI matching or recommendation engine.
- Subscription plans or premium memberships.

### 1.5 Definitions
- **Poster**: A user who creates a task.
- **Tasker**: A user who applies to, bids on, or completes a task.
- **Bid**: A Tasker proposal containing price, message, and estimated completion details.
- **Fixed-price task**: A task with a set price where Taskers can request/accept the task.
- **Assignment**: The accepted relationship between one Poster, one Tasker, and one task.
- **Escrow-style payment**: A simulated payment hold where the Poster pays after hiring, but payout is only recorded after completion confirmation.
- **Admin**: A user with permission to manage platform activity, disputes, reports, and suspicious records.

## 2. Overall Description

### 2.1 Product Perspective
TaskHive is a web-based platform with a frontend interface, backend REST API, database, authentication system, message broker, and external service integrations.

The system should demonstrate the school project's core technical requirements:
- At least one custom RESTful API.
- Data read/write using SQL or NoSQL.
- Message broker for async tasks.
- At least two external API integrations.
- Token-based API authentication.
- Basic CI pipeline.

### 2.2 Product Functions
Major functions include:
- Account creation and login.
- Profile setup and verification.
- Task creation and management.
- Task browsing, searching, and filtering.
- Bidding and fixed-price request workflow.
- Chat before hiring.
- Hiring approval.
- Payment processing using Stripe test mode.
- Completion confirmation and payout record simulation.
- Ratings and reviews.
- Reports and disputes.
- Admin management and analytics.

### 2.3 User Classes

#### Guest
Guests can:
- View the landing page.
- Register for an account.
- Log in.
- View general platform information.

Guests cannot:
- Post tasks.
- Bid on tasks.
- Send chat messages.
- Access private dashboards.

#### Registered User
Registered users can act as both Posters and Taskers.

Registered users can:
- Manage their profile.
- Create tasks.
- Browse and apply to tasks.
- View tasks they created.
- View tasks they applied to or accepted.
- Chat with other users before hiring.
- Send or receive ratings after completed tasks.

#### Poster
Posters can:
- Create bidding-mode or fixed-price tasks.
- Edit or cancel their own open tasks.
- Review bids and task requests.
- Approve a Tasker.
- Pay after hiring confirmation.
- Confirm task completion.
- Rate and review Taskers.
- Submit disputes or reports.

#### Tasker
Taskers can:
- Browse available tasks.
- Submit bids for bidding-mode tasks.
- Request fixed-price tasks.
- Chat with Posters.
- Complete assigned tasks.
- Mark tasks as complete.
- View earnings and payout records.
- Rate and review Posters.

#### Admin
Admins can:
- Manage users and profiles.
- Review suspicious users, tasks, payments, and reports.
- View all task records.
- View payment and payout records.
- Resolve reports and disputes.
- View analytics.
- Manage categories and platform settings.

### 2.4 Operating Environment
The initial system is planned as a responsive web application that works on desktop and mobile browsers.

Recommended technical environment:
- Framework: Next.js App Router with React and TypeScript.
- API: Next.js REST Route Handlers under `src/app/api`.
- Database: Supabase PostgreSQL with Prisma.
- Optional NoSQL: MongoDB Atlas for chat messages or notification logs.
- Message Broker: Upstash QStash for async jobs.
- External APIs: Stripe test mode, Mapbox, Resend, and Cloudinary.
- CI: GitHub Actions.

### 2.5 Constraints
- The project must be feasible for a school project timeline.
- Stripe should be used in test mode only.
- Escrow and payout release should be simulated through internal records.
- Maps should be used for task location and distance display.
- API endpoints must be protected using token-based authentication.
- The first wireframes should focus on the full page inventory, with priority on the main marketplace flow.

### 2.6 Proposed System Architecture
TaskHive should use a simple layered web architecture. This keeps the project practical for a school team while still satisfying the required API, database, middleware, security, external API, and CI expectations.

#### 2.6.1 Recommended Architecture Style
The recommended architecture is a **single full-stack Next.js modular monolith** deployed on Vercel.

- **React UI pages**: Handle pages, forms, dashboards, task browsing, payment confirmation screens, and admin screens.
- **Next.js REST Route Handlers**: Handle custom REST API endpoints, business logic, auth checks, database access, external API calls, and async job creation.
- **Supabase PostgreSQL**: Stores core marketplace records such as users, tasks, bids, assignments, payments, reviews, reports, and disputes.
- **MongoDB Atlas**: Stores chat messages, notification logs, or activity logs if both SQL and NoSQL need to be demonstrated.
- **Upstash QStash**: Processes async jobs such as notifications, reminders, and email sending.
- **External APIs**: Stripe for payment checkout, Mapbox for location features, Resend for email, and Cloudinary for uploads.
- **GitHub Actions**: Runs automated checks before deployment or merging.

This is preferred over a separate Vite frontend and NestJS backend because it removes the need for Render while keeping a visible custom REST API.

#### 2.6.2 Suggested Technology Stack
The exact framework can still be chosen by the team, but the following stack is recommended because it is common, free-tier friendly, and easy to demonstrate:

| Layer | Recommended Tool | Purpose |
| --- | --- | --- |
| App Framework | Next.js App Router | Builds the React UI and custom REST API route handlers. |
| SQL Database | Supabase PostgreSQL with Prisma | Stores core relational marketplace data. |
| Optional NoSQL | MongoDB Atlas | Stores chat messages or notification logs. |
| Message Broker | Upstash QStash | Runs background jobs and async notifications. |
| Payments | Stripe test mode | Handles checkout and payment simulation. |
| Maps | Mapbox | Handles locations, maps, and distance display. |
| Email | Resend | Sends transactional notifications. |
| Uploads | Cloudinary | Stores profile, portfolio, and task proof images. |
| CI | GitHub Actions | Runs linting, tests, and build checks. |

#### 2.6.3 High-Level Component Diagram
```text
User Browser
    |
    v
Next.js App on Vercel
    |
    +--> React UI Pages
    |
    +--> REST API Route Handlers
          |
          +--> Better Auth
          +--> Prisma -> Supabase PostgreSQL
          +--> MongoDB Atlas
          +--> Upstash QStash
          +--> Stripe API
          +--> Mapbox API
          +--> Resend API
          +--> Cloudinary API
```

#### 2.6.4 Backend Module Architecture
The backend should be organized by feature module:

- **Auth Module**: signup, login, password hashing, JWT issuing, token validation.
- **User/Profile Module**: account details, profile verification, skills, portfolio, ratings summary.
- **Task Module**: task creation, editing, browsing, filtering, location, status transitions.
- **Bid/Request Module**: bidding-mode proposals and fixed-price task requests.
- **Hiring Module**: Poster approval, auto-approval option, assignment creation.
- **Payment Module**: Stripe checkout session, payment status, platform fee, payout record simulation.
- **Chat Module**: conversations and messages before hiring.
- **Notification Module**: stores notifications and queues async delivery jobs.
- **Review Module**: two-way ratings and reviews after completion.
- **Report/Dispute Module**: user reports, task reports, disputes, status handling.
- **Admin Module**: global admin dashboard, user/task/payment moderation, reports, disputes, analytics.

#### 2.6.5 Data Flow for Main Marketplace Process
The main data flow should be:

1. User signs up or logs in through the Auth API.
2. Backend returns a token used for protected API requests.
3. Poster creates a task through the Task API.
4. Task is saved in the SQL database.
5. Tasker browses tasks and submits a bid or fixed-price request.
6. Bid/request is saved in the SQL database.
7. Message broker creates a notification job for the Poster.
8. Poster and Tasker may chat before hiring.
9. Poster approves one Tasker.
10. Backend creates an assignment and starts Stripe checkout.
11. Payment status is recorded as paid pending completion.
12. Tasker marks the task complete.
13. Poster confirms completion.
14. Backend records payout release and platform fee.
15. Poster and Tasker submit reviews.
16. Ratings are reflected on both profiles.

#### 2.6.6 Security Architecture
Security should be enforced at the API layer.

- Public routes include registration, login, and public task browsing.
- Protected routes require a valid token.
- Admin routes require both a valid token and admin permission.
- Ownership checks prevent users from editing tasks, chats, payments, or disputes that do not belong to them.
- Payment card details are handled by Stripe and should not be stored directly by TaskHive.
- Chat access is limited to users involved in the conversation.

#### 2.6.7 Deployment Architecture
For the school project, deployment can be simple:

- Full-stack Next.js app deployed through Vercel.
- SQL database hosted through Supabase PostgreSQL.
- MongoDB Atlas used for NoSQL chat/log data.
- Upstash QStash used for async jobs.
- CI pipeline hosted in GitHub Actions.

#### 2.6.8 Architecture Decision
TaskHive should start as a Next.js full-stack modular monolith because the team can build all features in one codebase while keeping pages, route handlers, services, and integrations clearly separated. This architecture satisfies the school requirements without requiring a separate backend host.

## 3. Core Technical Requirements

### 3.1 API & Data Category
TaskHive will implement a custom RESTful API. The REST API will handle all important system actions and must read from and write to the database.

#### 3.1.1 REST API Modules
- Authentication API
- User/Profile API
- Task API
- Bid/Request API
- Hiring/Assignment API
- Chat API
- Payment/Payout API
- Review/Rating API
- Report/Dispute API
- Notification API
- Admin API

#### 3.1.2 Example REST Endpoints
The final implementation may adjust exact endpoint names, but the planned API structure is:

| Method | Endpoint | Purpose | Protected |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Create user account | No |
| POST | `/api/auth/login` | Log in and receive token | No |
| GET | `/api/users/me` | Get current user profile | Yes |
| PATCH | `/api/users/me` | Update current user profile | Yes |
| GET | `/api/tasks` | Browse/search tasks | Optional |
| POST | `/api/tasks` | Create task | Yes |
| GET | `/api/tasks/:id` | View task detail | Optional |
| PATCH | `/api/tasks/:id` | Edit own task | Yes |
| POST | `/api/tasks/:id/bids` | Submit bid | Yes |
| GET | `/api/tasks/:id/bids` | View bids for own task | Yes |
| POST | `/api/tasks/:id/requests` | Request fixed-price task | Yes |
| POST | `/api/tasks/:id/hire` | Approve Tasker | Yes |
| POST | `/api/payments/checkout` | Create Stripe checkout session | Yes |
| POST | `/api/tasks/:id/complete` | Tasker marks task complete | Yes |
| POST | `/api/tasks/:id/confirm` | Poster confirms completion | Yes |
| POST | `/api/reviews` | Submit review | Yes |
| GET | `/api/chats` | View chat inbox | Yes |
| POST | `/api/chats/:id/messages` | Send chat message | Yes |
| POST | `/api/reports` | Submit report | Yes |
| POST | `/api/disputes` | Submit dispute | Yes |
| GET | `/api/admin/dashboard` | View admin dashboard | Admin only |

#### 3.1.3 Database Plan
TaskHive should use a SQL database for core marketplace data because tasks, bids, users, payments, and reviews have strong relationships.

Recommended SQL entities:
- `users`
- `profiles`
- `tasks`
- `categories`
- `bids`
- `task_requests`
- `assignments`
- `payments`
- `payouts`
- `reviews`
- `reports`
- `disputes`
- `admin_actions`

Optional NoSQL entities:
- `chat_messages`
- `notification_logs`
- `activity_logs`

If only one database is required, SQL is enough. If the instructor expects both SQL and NoSQL, SQL should store the main marketplace data and NoSQL should store chat or notification history.

### 3.2 Middleware & Cloud Category
TaskHive will use a message broker to process background tasks asynchronously. This improves the system by moving non-immediate work away from the main request/response flow.

#### 3.2.1 Message Broker Use Cases
The message broker can process:
- New bid notification jobs.
- New chat message notification jobs.
- Hiring confirmation jobs.
- Payment confirmation jobs.
- Completion reminder jobs.
- Review reminder jobs.
- Dispute/report alert jobs.
- Email notification jobs.

Recommended option:
- **Upstash QStash** for a serverless-friendly message broker that works well with Vercel.

#### 3.2.2 External API Integrations
TaskHive should integrate at least two external APIs.

Required recommended integrations:

1. **Stripe API**
   - Used for payment checkout in test mode.
   - Supports payment records after hiring confirmation.
   - Allows escrow-style payment simulation.
   - Helps track platform fees and payout records.

2. **Mapbox API**
   - Used for task location picker.
   - Shows task location on map.
   - Supports nearby task display.
   - Supports distance calculation between user and task.

Optional integrations:

3. **Resend or Brevo**
   - Used for email notifications.
   - Can send signup, bid, hiring, payment, and dispute emails.

4. **Cloudinary**
   - Used for profile photos.
   - Used for portfolio images.
   - Used for task proof or attachment uploads.

### 3.3 Security & QA Category
TaskHive API endpoints must be protected using token-based authentication. The system must also include a basic CI pipeline.

#### 3.3.1 Authentication
- Users log in using email and password.
- After login, the server returns a JWT or equivalent access token.
- Protected API requests must include the token.
- Invalid, missing, or expired tokens must be rejected.

#### 3.3.2 Authorization
The system must enforce role and ownership rules:
- Guests cannot create tasks, bid, chat, pay, review, report, or access dashboards.
- Users can only edit their own profiles.
- Posters can only edit their own tasks.
- Taskers cannot bid on their own tasks.
- Only the Poster who owns a task can approve a Tasker.
- Only the assigned Tasker can mark a task complete.
- Only the Poster who owns the task can confirm completion.
- Only users involved in a completed task can leave reviews.
- Only Admins can access admin pages and admin API endpoints.

#### 3.3.3 QA and CI Pipeline
The CI pipeline should run automatically when code is pushed.

Recommended CI steps:
- Install dependencies.
- Run linting.
- Run type checking if TypeScript or typed backend is used.
- Run unit tests.
- Run API tests.
- Run authentication/authorization tests.
- Run frontend build check.

## 4. Functional Requirements

### 4.1 Authentication and Account Management
| ID | Requirement |
| --- | --- |
| FR-001 | The system shall allow users to create an account using email, password, name, and contact details. |
| FR-002 | The system shall allow users to log in and receive a token for authenticated requests. |
| FR-003 | The system shall allow one account to act as both Poster and Tasker. |
| FR-004 | The system shall allow users to update their profile information. |
| FR-005 | The system shall display user verification status on profiles. |
| FR-006 | The system shall allow users to view tasks they created and tasks they applied to from one unified dashboard. |

### 4.2 Profile, Skills, and Portfolio
| ID | Requirement |
| --- | --- |
| FR-007 | The system shall allow Taskers to add skills and tags. |
| FR-008 | The system shall allow Taskers to add portfolio items or work samples. |
| FR-009 | The system shall show Tasker ratings, completed tasks, and reviews. |
| FR-010 | The system shall show Poster ratings, posted tasks, and reviews. |
| FR-011 | The system shall allow users to report suspicious or inappropriate profiles. |
| FR-011A | The system shall provide a guided profile setup flow for profile details, identity, contact/location, skills, portfolio, and final review. |

### 4.3 Task Management
| ID | Requirement |
| --- | --- |
| FR-012 | The system shall allow Posters to create tasks. |
| FR-013 | Each task shall include title, description, category, budget, deadline, location, and hiring mode. |
| FR-014 | The system shall support bidding-mode tasks. |
| FR-015 | The system shall support fixed-price tasks. |
| FR-016 | The system shall allow Posters to edit open tasks they created. |
| FR-017 | The system shall allow Posters to cancel open tasks they created. |
| FR-018 | The system shall allow users to browse available tasks. |
| FR-019 | The system shall allow users to search and filter tasks by keyword, category, budget, location, and status. |
| FR-020 | The system shall show task status such as open, pending payment, assigned, in progress, awaiting confirmation, completed, cancelled, or disputed. |
| FR-020A | The system shall allow users to browse tasks by location using a map and nearby task list. |

### 4.4 Bidding, Requests, and Hiring
| ID | Requirement |
| --- | --- |
| FR-021 | The system shall allow Taskers to submit bids on bidding-mode tasks. |
| FR-022 | A bid shall include proposed price, message, and estimated completion time. |
| FR-023 | The system shall allow Taskers to request fixed-price tasks. |
| FR-024 | The system shall allow Posters to compare bids and task requests. |
| FR-025 | The system shall allow Posters to manually approve a Tasker. |
| FR-026 | The system shall allow fixed-price tasks to use auto-approval if enabled by the Poster. |
| FR-027 | The system shall create an assignment after a Tasker is approved. |
| FR-028 | The system shall prevent multiple Taskers from being assigned to the same single-person task. |

### 4.5 Chat
| ID | Requirement |
| --- | --- |
| FR-029 | The system shall allow Posters and Taskers to chat before hiring. |
| FR-030 | The system shall store chat messages. |
| FR-031 | The system shall show chat conversations in an inbox. |
| FR-032 | The system shall restrict chat access to the users involved in that conversation. |
| FR-033 | The system shall notify users when they receive new messages. |
| FR-033A | The system shall show chat history and task-related conversation context. |

### 4.6 Payments and Payouts
| ID | Requirement |
| --- | --- |
| FR-034 | The system shall require payment after hiring confirmation. |
| FR-035 | The system shall integrate Stripe test mode for checkout. |
| FR-036 | The system shall record payment status after checkout. |
| FR-037 | The system shall hold payment in a pending escrow-style status until task completion is confirmed. |
| FR-038 | The system shall calculate and record a platform fee. |
| FR-039 | The system shall record payout release after Poster confirms completion. |
| FR-040 | The system shall show payment history to the Poster. |
| FR-041 | The system shall show earnings and payout history to the Tasker. |
| FR-041A | The system shall allow Admins to view payment metadata needed for escrow, refund, payout, and dispute handling. |

### 4.7 Task Completion and Reviews
| ID | Requirement |
| --- | --- |
| FR-042 | The system shall allow the assigned Tasker to mark a task as complete. |
| FR-043 | The system shall allow the Poster to confirm task completion. |
| FR-044 | The system shall release or record payout after completion confirmation. |
| FR-045 | The system shall allow Posters to rate and review Taskers after completion. |
| FR-046 | The system shall allow Taskers to rate and review Posters after completion. |
| FR-047 | The system shall display ratings and reviews on user profiles. |

### 4.8 Reports and Disputes
| ID | Requirement |
| --- | --- |
| FR-048 | The system shall allow users to report inappropriate tasks, users, or messages. |
| FR-049 | The system shall allow users to submit disputes related to task completion or payment. |
| FR-050 | The system shall allow Admins to manage moderation reports separately from task or payment disputes. |
| FR-051 | The system shall allow Admins to update report and dispute status. |
| FR-052 | The system shall keep a record of admin actions. |

### 4.9 Notifications
| ID | Requirement |
| --- | --- |
| FR-053 | The system shall notify Posters when a new bid or request is submitted. |
| FR-054 | The system shall notify Taskers when they are approved or rejected. |
| FR-055 | The system shall notify users about chat messages. |
| FR-056 | The system shall notify users about payment updates. |
| FR-057 | The system shall notify users about completion and review reminders. |
| FR-058 | The system shall notify Admins about reports and disputes. |

### 4.10 Admin and Analytics
| ID | Requirement |
| --- | --- |
| FR-059 | The system shall allow Admins to view user records. |
| FR-060 | The system shall allow Admins to view task records. |
| FR-061 | The system shall allow Admins to view payment and payout records. |
| FR-062 | The system shall allow Admins to review suspicious activity. |
| FR-063 | The system shall allow Admins to manage task categories. |
| FR-064 | The system shall show analytics for users, tasks, completed tasks, revenue, platform fees, and categories. |

## 5. Non-Functional Requirements

### 5.1 Security
- NFR-001: The system shall protect private API endpoints with token-based authentication.
- NFR-002: The system shall enforce role-based and ownership-based authorization.
- NFR-003: Passwords shall be stored using secure hashing.
- NFR-004: Sensitive payment details shall not be stored directly in TaskHive.
- NFR-005: Admin routes shall only be accessible to admin users.
- NFR-005A: Admin payment views shall show only safe transaction metadata, such as task, users, amount, platform fee, status, date, and external payment reference.
- NFR-005B: Admin payment views shall not show full card numbers, CVV, bank credentials, raw payment tokens, or payment provider secrets.

### 5.2 Usability
- NFR-006: The system shall be usable on desktop and mobile browsers.
- NFR-007: Common actions such as creating a task, submitting a bid, approving a Tasker, and confirming completion should be easy to find.
- NFR-008: The unified user dashboard should separate tasks created by the user from tasks the user applied to or accepted.

### 5.3 Performance
- NFR-009: Task lists should load within a reasonable time for a school demo dataset.
- NFR-010: Search and filter actions should return results without requiring a full page reload if using a modern frontend.
- NFR-011: Async notifications should not block task creation, bidding, hiring, or payment actions.

### 5.4 Reliability
- NFR-012: Payment records should keep a clear status history.
- NFR-013: The system should not assign two Taskers to one single-person task.
- NFR-014: Failed async jobs should be retryable or logged.

### 5.5 Maintainability
- NFR-015: API routes should be organized by module.
- NFR-016: Database models should use clear relationships and constraints.
- NFR-017: The project should include a README or setup notes for local development.

### 5.6 QA
- NFR-018: The project shall include a basic CI pipeline.
- NFR-019: The project shall include tests for protected API endpoints.
- NFR-020: The project shall include tests for major task, hiring, payment, and review flows.

## 6. Data Requirements

### 6.1 Main Entities
| Entity | Description |
| --- | --- |
| User | Stores account credentials, role capability, and account status. |
| Profile | Stores public profile, contact details, verification status, skills, and bio. |
| Task | Stores task details, category, budget, location, deadline, mode, and status. |
| Bid | Stores Tasker proposal for bidding-mode tasks. |
| TaskRequest | Stores Tasker request for fixed-price tasks. |
| Assignment | Connects one task to the approved Tasker. |
| Payment | Stores checkout and payment status. |
| Payout | Stores simulated payout release and platform fee details. |
| Review | Stores rating and review between Poster and Tasker. |
| Chat | Stores conversation metadata between users. |
| Message | Stores chat messages. |
| Notification | Stores user notification records. |
| Report | Stores reports about users, tasks, or messages. |
| Dispute | Stores task or payment complaints. |
| AdminAction | Stores admin decisions and moderation actions. |

### 6.2 Important Status Values
Task status examples:
- `open`
- `pending_approval`
- `pending_payment`
- `assigned`
- `in_progress`
- `awaiting_confirmation`
- `completed`
- `cancelled`
- `disputed`

Payment status examples:
- `unpaid`
- `checkout_started`
- `paid_pending_completion`
- `released`
- `refunded`
- `disputed`

Bid/request status examples:
- `submitted`
- `accepted`
- `rejected`
- `withdrawn`

## 7. Main User Flows

### 7.1 Poster Creates and Hires Through Bidding
1. User logs in.
2. User creates a task and selects bidding mode.
3. Taskers browse the task and submit bids.
4. Poster chats with Taskers if clarification is needed.
5. Poster compares bids.
6. Poster approves one Tasker.
7. Poster pays through Stripe test checkout.
8. Task becomes assigned/in progress.

### 7.2 Poster Creates a Fixed-Price Task
1. User logs in.
2. User creates a fixed-price task.
3. Taskers request or accept the task.
4. If manual approval is selected, Poster chooses a Tasker.
5. If auto-approval is selected, the first valid Tasker may be assigned.
6. Poster pays after hiring confirmation.
7. Task becomes assigned/in progress.

### 7.3 Task Completion and Review
1. Assigned Tasker completes the task.
2. Tasker marks task as complete.
3. Poster reviews the completed work.
4. Poster confirms completion.
5. System records payout release and platform fee.
6. Poster rates Tasker.
7. Tasker rates Poster.
8. Reviews appear on profiles.

### 7.4 Dispute Flow
1. Poster or Tasker submits a dispute.
2. System marks the task or payment as disputed.
3. Admin receives a dispute notification.
4. Admin reviews task details, chat, payment status, and user history.
5. Admin updates dispute status and records action.

## 8. Page Inventory for Wireframes

Each wireframe page should identify its purpose, target user, main content, main actions, and related modules. This section is the source of truth for the first UI planning pass.

### 8.1 Public and Authentication Pages

| Page | Purpose | Primary User | Main Content | Main Actions | Related Modules |
| --- | --- | --- | --- | --- | --- |
| Landing Page | Introduce TaskHive and guide visitors into signup or browsing. | Guest | Introduction and CTA, 3-step Zero Hassle area with three illustrations, task category preview, questions/FAQ area, Why TaskHive area, final CTA, footer. | Sign up, log in, browse public task examples. | Auth, Task, Category |
| Login Page | Allow existing users to access the platform through Better Auth. | Guest, Registered User | Email/password fields, continue with Google option if enabled, forgot password link. | Log in, continue with Google, recover password. | Auth, User |
| Sign Up Page | Register a new TaskHive account. | Guest | Full name, email, phone number, password, confirm password, terms agreement, continue with Google option. | Create account, continue with Google, accept terms. | Auth, User, Profile |
| Profile Setup Verification | Build a trusted user profile after signup. | Registered User | Building Hive Profile intro, profile setup, identity, confirming identity, contact and location, skills and tags, portfolio, review and continue. | Save profile details, upload portfolio/proof images, confirm setup. | Profile, Uploads, Mapbox, Auth |

### 8.2 Shared User Pages

| Page | Purpose | Primary User | Main Content | Main Actions | Related Modules |
| --- | --- | --- | --- | --- | --- |
| Main Dashboard | Give one account a single place to manage Poster and Tasker activity. | Registered User | Welcome back message, tasks near you, browse task section, category shortcuts, tasks created by the user, task requests/applications, recent messages, profile completion/verification status. | Browse tasks, create task, view created tasks, view applied/requested tasks, open messages, continue profile setup. | User, Profile, Task, Bid, Request, Chat, Notification |
| My Tasks | Show task ownership and participation in one organized view. | Registered User | Tasks I Created, Tasks I Applied To, assigned tasks, task statuses, pending actions. | Open task detail, edit own open task, cancel own open task, view application/request status. | Task, Bid, Request, Assignment |
| Task Detail | Show complete task information and available next action based on role/status. | Registered User, Guest for public view | Task title, category, budget, deadline, location, Poster profile summary, description, current status, bids/request area, payment/completion state if assigned. | Submit bid, request fixed-price task, chat with Poster, approve Tasker, report task, mark complete, confirm completion. | Task, Profile, Bid, Request, Chat, Payment, Review, Report |
| Messages | Show task-related chat history and active conversations. | Registered User | Chat inbox, conversation view, sender/receiver messages, task context, message input. | Open conversation, send message, view related task, report message. | Chat, Task, Notification, Report |
| Browse by Location | Help users discover nearby tasks through map-based browsing. | Registered User | Mapbox map, nearby task markers, selected area, distance filter, task list tied to map location. | Search location, adjust distance, open task detail, save location preference. | Task, Mapbox, Profile |
| Settings | Manage basic account and notification preferences. | Registered User | Account information, password/auth settings, notification preferences, privacy settings, location settings, account status. | Update account details, change password/auth settings, update notification preferences, update privacy/location settings. | User, Auth, Profile, Notification |

### 8.3 Poster Pages

| Page | Purpose | Primary User | Main Content | Main Actions | Related Modules |
| --- | --- | --- | --- | --- | --- |
| Create Task | Let a Poster publish a new task. | Poster | Title, description, category, budget, deadline, location, hiring mode, auto-approval option for fixed-price tasks. | Save draft, publish task, choose bidding or fixed-price mode. | Task, Category, Mapbox |
| Edit Task | Let a Poster update an open task they own. | Poster | Existing task details, editable task fields, current status. | Save changes, cancel task, return to task detail. | Task, Auth |
| Bid/Request Management | Let a Poster compare Taskers before hiring. | Poster | Bid list, fixed-price request list, Tasker profile summary, price, message, ETA, rating. | Compare bids, open Tasker profile, chat, approve Tasker, reject bid/request. | Bid, Request, Profile, Chat, Hiring |
| Hiring and Payment Confirmation | Complete hiring by approving a Tasker and starting payment. | Poster | Selected Tasker, task summary, amount, platform fee, payment status, Stripe checkout placeholder. | Confirm hire, start Stripe checkout, return to task. | Assignment, Payment, Stripe |
| Completion Confirmation | Let the Poster verify completed work before release. | Poster | Completed task summary, Tasker completion note/proof, payment hold status, confirmation controls. | Confirm completion, open dispute, release simulated payout record. | Task, Payment, Payout, Dispute, Notification |
| Rate Tasker | Capture Poster-to-Tasker reputation after completion. | Poster | Tasker name, completed task summary, rating categories, public review field. | Submit review, skip for now, view Tasker profile. | Review, Profile |
| Payment History | Show the Poster's task payments. | Poster | Payment records, task links, amounts, statuses, dates, refund/dispute status. | View payment detail, open related task, submit dispute if eligible. | Payment, Payout, Dispute |
| Report/Dispute Form | Allow Poster to raise moderation or task/payment issues. | Poster | Issue type, related task/user/message, reason, description, optional attachments. | Submit report, submit dispute, upload evidence. | Report, Dispute, Uploads, Notification |

### 8.4 Tasker Pages

| Page | Purpose | Primary User | Main Content | Main Actions | Related Modules |
| --- | --- | --- | --- | --- | --- |
| Browse Tasks | Let Taskers find available work. | Tasker | Search, filters, category list, task cards/list, budget/location/deadline/status. | Search tasks, filter tasks, open task detail. | Task, Category, Mapbox |
| Submit Bid | Let a Tasker propose terms for a bidding-mode task. | Tasker | Proposed price, message, estimated completion time, task summary. | Submit bid, cancel, open chat. | Bid, Task, Chat, Notification |
| Request Fixed-Price Task | Let a Tasker request a fixed-price task. | Tasker | Fixed task price, task requirements, availability/confirmation message. | Request task, cancel, chat with Poster. | Request, Task, Chat, Notification |
| My Bids and Requests | Let a Tasker track applications and request status. | Tasker | Submitted bids, fixed-price requests, accepted/rejected/pending statuses, related tasks. | Open task, withdraw if allowed, chat with Poster. | Bid, Request, Task, Chat |
| Assigned Tasks | Show work the Tasker has been hired for. | Tasker | Assigned task list, payment status, deadline, completion status, next action. | Open active task, mark complete, message Poster. | Assignment, Task, Payment, Chat |
| Mark Task Complete | Let a Tasker submit task completion. | Tasker | Task summary, completion note, proof/attachment area, payment hold reminder. | Mark complete, upload proof, notify Poster. | Task, Uploads, Notification, Payment |
| Rate Poster | Capture Tasker-to-Poster reputation after completion. | Tasker | Poster name, completed task summary, rating categories, public review field. | Submit review, skip for now, view Poster profile. | Review, Profile |
| Earnings and Payouts | Show completed work earnings and payout records. | Tasker | Completed tasks, amounts, platform fee impact, payout status, dates. | View payout detail, open related task, submit dispute if needed. | Payment, Payout, Dispute |

### 8.5 Admin Pages

Admin pages are platform-level pages for TaskHive owners/operators. They are not per-community admin pages.

| Page | Purpose | Primary User | Main Content | Main Actions | Related Modules |
| --- | --- | --- | --- | --- | --- |
| Admin Dashboard | Give Admins a high-level view of marketplace health. | Admin | Total users, active tasks, platform revenue/fees, pending reports, marketplace health, report and dispute queue preview, recent activity. | Open user/task/payment/report/dispute records, review recent activity. | Admin, Analytics, User, Task, Payment, Report, Dispute |
| User Management | Let Admins monitor user accounts and trust signals. | Admin | Search and filters, user table, Poster rating, Tasker rating, status, joined date, action buttons. | View user, suspend user, restore user, review user history. | Admin, User, Profile, Report |
| Reports Management | Let Admins handle safety and moderation issues. | Admin | Report ID, reporter, accused user/task/message, reason, status, date, detailed report view. | Resolve report, dismiss report, suspend user, hide task/message, log admin action. | Report, AdminAction, User, Task, Chat |
| Disputes Management | Let Admins handle task/payment conflicts separately from reports. | Admin | Dispute ID, task, Poster, Tasker, amount, issue, escrow/payment status, timeline, evidence. | Release payment, refund Poster, request more info, close dispute, log admin action. | Dispute, Payment, Payout, Task, AdminAction |
| Payment Overview | Let Admins inspect safe payment metadata for escrow, release, refund, and payout support. | Admin | Held in review/escrow, released payments, platform fees, failed payments, payment table with payment ID, task, Poster, Tasker, amount, status, date. | View payment detail, open related task, open dispute, export metadata if allowed. | Payment, Payout, Stripe, AdminAction |
| Task Management | Let Admins review and moderate task records. | Admin | Task ID, Poster, assigned Tasker, budget, deadline, payment status, task status, actions. | View task, hide task, restore task, flag task, open related report/dispute. | Task, Payment, Report, Dispute, AdminAction |

Payment overview must only display safe transaction metadata. TaskHive must not display full card numbers, CVV, bank credentials, raw Stripe tokens, or payment provider secrets to Admins.

## 9. Wireframe Priority

For the first wireframing phase, create the full page inventory but prioritize the screens that explain the main marketplace flow:

1. Landing page.
2. Sign up and login.
3. Profile setup and verification.
4. Main dashboard with Tasks I Created and Tasks I Applied To.
5. Create task.
6. Browse/search tasks.
7. Task detail.
8. Chat conversation.
9. Submit bid or request fixed-price task.
10. Poster bid/request comparison.
11. Approve Tasker.
12. Hiring/payment confirmation.
13. Active task detail.
14. Mark task complete.
15. Completion confirmation.
16. Two-way rating/review.
17. Admin dashboard.
18. Reports and disputes.

## 10. Project Phases and Tasks

The project should be built in phases so the team can finish the core system first, then add integrations, admin tools, and polish. Each phase should produce something that can be shown, tested, or used in the next phase.

### Phase 1: Planning, SRS, and Wireframes
Goal: Finalize what TaskHive will do before development starts.

Tasks:
- Finalize SRS requirements.
- Confirm user roles and permissions.
- Finalize page inventory.
- Create Figma wireframes for all major pages.
- Create main user-flow diagram.
- Decide final technology stack.
- Assign modules to team members.

Deliverables:
- Completed SRS document.
- Figma wireframes.
- Architecture diagram.
- Phase/task breakdown.

### Phase 2: Project Setup and Foundation
Goal: Prepare the codebase, database, API structure, and CI pipeline.

Tasks:
- Set up frontend project.
- Set up backend REST API project.
- Set up database connection.
- Create initial database schema or models.
- Configure environment variables.
- Set up basic routing structure.
- Add GitHub Actions CI pipeline.
- Add initial README/setup instructions.

Deliverables:
- Running frontend.
- Running backend API.
- Connected database.
- Basic CI pipeline.

### Phase 3: Authentication, Profiles, and Roles
Goal: Build the account system and protected API foundation.

Tasks:
- Implement signup.
- Implement login.
- Implement JWT/token-based authentication.
- Add protected route middleware.
- Add user profile creation.
- Add profile editing.
- Add profile verification fields.
- Support one account acting as both Poster and Tasker.
- Add authorization checks for normal users and Admins.

Deliverables:
- Working auth flow.
- Protected API endpoints.
- User profile pages/API.
- Role and permission logic.

### Phase 4: Task Marketplace Core
Goal: Build the main marketplace flow without payments first.

Tasks:
- Implement task creation.
- Implement task editing and cancellation.
- Implement task browsing.
- Implement search and filters.
- Add task categories.
- Add bidding-mode tasks.
- Add fixed-price tasks.
- Implement bid submission.
- Implement fixed-price task requests.
- Implement Poster bid/request comparison.
- Implement Tasker approval.
- Create task assignment records.
- Add task status transitions.

Deliverables:
- Users can post tasks.
- Users can browse tasks.
- Taskers can bid or request tasks.
- Posters can approve Taskers.
- Assigned task tracking works.

### Phase 5: Chat and Notifications
Goal: Add pre-hiring communication and async background processing.

Tasks:
- Implement chat conversations.
- Allow Poster and Tasker to chat before hiring.
- Store chat messages.
- Add chat inbox.
- Set up message broker.
- Queue notification jobs for bids, requests, chats, hiring updates, payment updates, completion reminders, and disputes.
- Add notifications page.

Deliverables:
- Working chat flow.
- Message broker integrated.
- Async notifications working or logged.

### Phase 6: Payments, Completion, and Reviews
Goal: Complete the full task lifecycle from hiring to payment release and reputation.

Tasks:
- Integrate Stripe test checkout.
- Create payment records.
- Mark payment as paid pending completion after checkout.
- Add platform fee calculation.
- Allow Tasker to mark task complete.
- Allow Poster to confirm completion.
- Record payout release after confirmation.
- Add Poster-to-Tasker review.
- Add Tasker-to-Poster review.
- Show ratings and reviews on profiles.

Deliverables:
- Stripe test payment flow.
- Escrow-style payment status flow.
- Completion confirmation flow.
- Two-way review system.

### Phase 7: Maps and Location Features
Goal: Add location support for local errands.

Tasks:
- Integrate Mapbox.
- Add location picker to create task page.
- Store task location data.
- Show task location on task detail.
- Add nearby task display.
- Add distance calculation or approximate distance display.

Deliverables:
- Task location picker.
- Map display.
- Nearby task browsing.

### Phase 8: Reports, Disputes, and Admin
Goal: Add platform moderation and global admin controls.

Tasks:
- Implement report form.
- Implement dispute form.
- Add report records.
- Add dispute records.
- Build Admin dashboard.
- Add user management.
- Add task management.
- Add payment/payout overview.
- Add reports queue.
- Add dispute detail/resolution page.
- Add admin action logging.
- Add basic analytics.

Deliverables:
- Global Admin panel.
- Reports and disputes workflow.
- Payment and task moderation.
- Analytics dashboard.

### Phase 9: QA, Polish, and Presentation Prep
Goal: Make the system stable enough to demo and explain.

Tasks:
- Test authentication and protected routes.
- Test task creation, bidding, hiring, payment, completion, and review flow.
- Test admin-only pages and endpoints.
- Test message broker jobs.
- Test external API integrations.
- Fix UI layout issues.
- Prepare demo accounts.
- Prepare sample tasks and records.
- Prepare final presentation screenshots.

Deliverables:
- Working demo flow.
- Passing CI checks.
- Demo-ready seeded data.
- Final presentation material.

### Recommended Team Assignment
If the team has multiple members, split work by module:

- **Frontend/UI member**: Wireframes, frontend pages, forms, dashboards.
- **Backend/API member**: REST API routes, controllers, services, validation.
- **Database member**: Schema, models, relationships, seed data.
- **Integrations member**: Stripe, Maps, message broker, notifications.
- **QA/Admin member**: Admin panel, test cases, CI, reports/disputes.

For a smaller team, combine roles:
- Member 1: Frontend and wireframes.
- Member 2: Backend API and database.
- Member 3: Integrations, admin, and QA.

## 11. Acceptance Criteria and Test Scenarios

### 11.1 Authentication
- A Guest can register successfully.
- A registered user can log in and receive a token.
- Protected endpoints reject requests without a valid token.
- Admin endpoints reject non-admin users.

### 11.2 Task Creation and Browsing
- A logged-in user can create a task.
- The task is saved to the database.
- Users can browse tasks.
- Users can search/filter tasks by category, budget, location, and status.
- A user can view tasks they created.
- A user can view tasks they applied to or accepted.

### 11.3 Bidding and Hiring
- A Tasker can submit a bid on a bidding-mode task.
- A Tasker can request a fixed-price task.
- A Poster can view bids and requests for their own task.
- A Poster can approve one Tasker.
- The system creates an assignment after approval.
- The system prevents unauthorized users from approving Taskers.

### 11.4 Chat
- Poster and Tasker can chat before hiring.
- Chat messages are stored.
- Users cannot access conversations they are not part of.
- New chat messages can trigger async notifications.

### 11.5 Payment and Completion
- Poster can start Stripe test checkout after hiring confirmation.
- Payment record is created after checkout.
- Payment remains pending until Poster confirms completion.
- Assigned Tasker can mark task complete.
- Poster can confirm completion.
- System records payout release and platform fee after confirmation.

### 11.6 Reviews
- Poster can review Tasker after completion.
- Tasker can review Poster after completion.
- Reviews appear on the correct user profiles.
- Users cannot review unrelated tasks.

### 11.7 Reports, Disputes, and Admin
- Users can submit reports.
- Users can submit disputes.
- Admin can view reports and disputes.
- Admin can update dispute status.
- Admin actions are recorded.

### 11.8 CI Pipeline
- CI installs dependencies.
- CI runs lint or style checks.
- CI runs tests.
- CI runs a build check.
- CI fails when tests fail.

## 12. Assumptions

- TaskHive is a responsive web application for school demonstration.
- One account can act as both Poster and Tasker.
- Users complete profile verification, but full legal identity verification is out of scope.
- Chat is available before hiring.
- Poster pays when hiring is confirmed.
- Payment release is recorded only after Poster confirms completion.
- Stripe is used in test mode only.
- Mapbox is used for location features.
- SQL is the main database.
- NoSQL may be added for chat history or notifications if both SQL and NoSQL are required.
- Escrow and payout release are simulated with internal status records.
- Admin review focuses on suspicious activity, reports, disputes, and task/payment moderation.
