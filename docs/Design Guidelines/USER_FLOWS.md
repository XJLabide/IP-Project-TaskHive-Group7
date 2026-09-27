# TaskHive User Flows

## Flow 1: Signup and Profile Setup
```text
Guest
  -> Landing Page
  -> Sign Up
  -> Login
  -> Profile Setup
  -> Profile Verification
  -> Main Dashboard
```

Purpose:
- Establish a verified account.
- Allow one user to act as both Poster and Tasker.

## Flow 2: Poster Creates a Bidding Task
```text
Poster Dashboard
  -> Create Task
  -> Select Bidding Mode
  -> Add Title, Description, Category, Budget, Deadline, Location
  -> Publish Task
  -> Posted Task Detail
  -> Receive Bids
```

Purpose:
- Let Posters request local help and receive multiple offers.

## Flow 3: Tasker Bids on a Task
```text
Tasker Dashboard
  -> Browse Tasks
  -> Search / Filter
  -> Task Detail
  -> Chat with Poster
  -> Submit Bid
  -> Tasks I Applied To
```

Purpose:
- Let Taskers discover tasks and apply before being hired.

## Flow 4: Fixed-Price Task Request
```text
Poster Creates Fixed-Price Task
  -> Tasker Opens Task Detail
  -> Tasker Requests Task
  -> Poster Reviews Request
  -> Poster Approves Tasker
```

Alternative:
```text
Poster Enables Auto-Approval
  -> First Valid Tasker Requests Task
  -> System Assigns Tasker
```

Purpose:
- Support simpler tasks where the Poster already knows the price.

## Flow 5: Hiring and Payment
```text
Poster Opens Bid/Request List
  -> Compares Taskers
  -> Approves One Tasker
  -> Stripe Test Checkout
  -> Payment Recorded as Paid Pending Completion
  -> Task Status Becomes In Progress
```

Purpose:
- Poster pays when hiring is confirmed.
- Payment is not released until completion is confirmed.

## Flow 6: Task Completion and Reviews
```text
Tasker Opens Assigned Task
  -> Marks Task Complete
  -> Poster Receives Notification
  -> Poster Confirms Completion
  -> Payout Release Recorded
  -> Poster Reviews Tasker
  -> Tasker Reviews Poster
  -> Reviews Appear on Profiles
```

Purpose:
- Complete the marketplace trust loop.

## Flow 7: Chat Before Hiring
```text
Task Detail
  -> Start Chat
  -> Conversation Page
  -> Poster and Tasker Exchange Messages
  -> Notification Job Created
```

Purpose:
- Allow clarification before bidding, requesting, or hiring.

## Flow 8: Report and Dispute
```text
User Opens Task / Profile / Chat
  -> Submit Report or Dispute
  -> Admin Receives Alert
  -> Admin Opens Reports Queue
  -> Admin Reviews Details
  -> Admin Updates Status
```

Purpose:
- Give the platform a moderation and conflict-resolution process.

## Flow 9: Global Admin Monitoring
```text
Admin Login
  -> Admin Dashboard
  -> User Management / Task Management / Payments / Reports / Disputes / Analytics
  -> Review Records
  -> Take Action
  -> Admin Action Logged
```

Purpose:
- Admin manages the whole web app, not individual communities.
