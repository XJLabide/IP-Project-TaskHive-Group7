---
status: accepted
---

# Keep task chat in PostgreSQL

Task-scoped chat threads, their messages, and message reports live in PostgreSQL through Prisma, next to tasks and users, rather than in MongoDB Atlas.

The participant rule ("opener or Poster"), the "task must be open to write" rule, and the report record all reference the same task and user rows. Keeping them in one relational store means one authorization read, one transaction boundary, and a direct join from a report to the offending message for Admin review. Splitting chat into MongoDB would duplicate task status and participant facts across stores and make the access rule eventually consistent.

MongoDB remains in the stack for log-style data that does not need relational integrity. If chat volume later outgrows relational storage, move it behind the existing `src/lib/chat/service.ts` interface without changing the API or authorization rules.
