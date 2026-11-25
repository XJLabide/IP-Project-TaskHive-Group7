import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskStatus } from "@prisma/client";

const { requireUserMock } = vi.hoisted(() => ({ requireUserMock: vi.fn() }));
vi.mock("@/lib/prisma", async () => {
  const { PrismaClient } = await import("@prisma/client");
  const url = process.env.MARKETPLACE_API_TEST_DATABASE_URL;
  if (!url) throw new Error("MARKETPLACE_API_TEST_DATABASE_URL must explicitly target a disposable, migrated database.");
  return { prisma: new PrismaClient({ datasourceUrl: url }) };
});
vi.mock("@/lib/api/response", () => ({
  requireUser: requireUserMock,
  created: (data: unknown) => Response.json({ data }, { status: 201 }),
  ok: (data: unknown, init?: ResponseInit) => Response.json({ data }, init),
  problem: (error: string, status = 400) => Response.json({ error }, { status }),
}));
// Identity is injected at the session boundary; no Firebase credentials or
// outbound notification delivery is needed to exercise real PostgreSQL writes.
vi.mock("@/lib/notifications", () => ({ notifyUser: vi.fn(), notifyAdmins: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { POST as review } from "./reviews/route";
import { POST as dispute } from "./disputes/route";
import { GET as profile } from "./profiles/[id]/route";

let ids: { poster: string; tasker: string; outsider: string };
let taskIds: string[];
let paymentIds: string[];
const past = new Date("2026-01-01T00:00:00Z");
const post = (path: string, body: unknown) => new Request(`https://example.test/api/${path}`, { method: "POST", body: JSON.stringify(body) });
const getProfile = (id: string) => profile(new Request(`https://example.test/api/profiles/${id}`), { params: Promise.resolve({ id }) });
function signIn(id: string) {
  requireUserMock.mockResolvedValue({ session: { user: { id } }, response: null });
}

async function task(status: TaskStatus, posterId = ids.poster, taskerId = ids.tasker) {
  const created = await prisma.task.create({ data: {
    posterId, title: "Integration fixture", description: "Disposable integration task", budgetCents: 10000,
    fulfillmentMode: "LOCAL", hiringMode: "FIXED_PRICE", status,
    publishedAt: status === "DRAFT" ? null : past,
    assignment: { create: { taskerId, status: status === "COMPLETED" ? "COMPLETED" : "ACTIVE", completedAt: past, confirmedAt: status === "COMPLETED" ? past : null } },
  } });
  taskIds.push(created.id);
  return created;
}
async function payment(taskId: string, released = false) {
  const result = await prisma.payment.create({ data: {
    taskId, posterId: ids.poster, amountCents: 10000, platformFeeCents: 500,
    status: released ? "RELEASED" : "PAID_PENDING_COMPLETION", provider: "integration_test",
  } });
  paymentIds.push(result.id);
  await prisma.payout.create({ data: { paymentId: result.id, taskerId: ids.tasker, amountCents: 9500, platformFeeCents: 500, releasedAt: released ? past : null } });
  return result;
}

beforeEach(async () => {
  taskIds = [];
  paymentIds = [];
  const prefix = `api66_${randomUUID()}`;
  ids = { poster: `${prefix}_poster`, tasker: `${prefix}_tasker`, outsider: `${prefix}_outsider` };
  await prisma.user.createMany({ data: Object.entries(ids).map(([role, id]) => ({ id, name: `Stored ${role}`, email: `${id}@example.test`, emailVerified: true, status: "ACTIVE" })) });
  signIn(ids.poster);
});
afterEach(async () => {
  // Delete only fixtures created by this test; never reset or truncate a schema.
  await prisma.payout.deleteMany({ where: { paymentId: { in: paymentIds } } });
  await prisma.task.deleteMany({ where: { id: { in: taskIds } } });
  await prisma.user.deleteMany({ where: { id: { in: Object.values(ids) } } });
});
afterAll(() => prisma.$disconnect());

describe("marketplace API persistence in PostgreSQL", () => {
  it("persists a real blind review, deriving both participants from trusted data", async () => {
    const completed = await task("COMPLETED");
    const response = await review(post("reviews", { taskId: completed.id, reviewerId: ids.outsider, revieweeId: ids.outsider, rating: 5, comment: "Excellent" }));
    expect(response.status).toBe(201);
    const { data } = await response.json();
    expect(await prisma.review.findUnique({ where: { id: data.reviewId } })).toMatchObject({
      taskId: completed.id, reviewerId: ids.poster, revieweeId: ids.tasker, rating: 5, comment: "Excellent", publishedAt: null,
    });
    const duplicate = await review(post("reviews", { taskId: completed.id, rating: 4 }));
    expect(duplicate.status).toBe(409);
    expect(await prisma.review.count({ where: { taskId: completed.id } })).toBe(1);
  });

  it("publishes both stored reviews when the counterpart submits", async () => {
    const completed = await task("COMPLETED");
    await review(post("reviews", { taskId: completed.id, rating: 4 }));
    expect((await (await getProfile(ids.tasker)).json()).data.taskerRating).toBeNull();
    signIn(ids.tasker);
    const response = await review(post("reviews", { taskId: completed.id, rating: 5 }));
    expect(response.status).toBe(201);
    expect((await response.json()).data.published).toBe(true);
    expect(await prisma.review.count({ where: { taskId: completed.id, publishedAt: { not: null } } })).toBe(2);
    expect((await (await getProfile(ids.tasker)).json()).data.taskerRating).toBe(4);
  });

  it("denies nonparticipants without storing a review", async () => {
    const completed = await task("COMPLETED");
    signIn(ids.outsider);
    expect((await review(post("reviews", { taskId: completed.id, rating: 5 }))).status).toBe(403);
    expect(await prisma.review.count({ where: { taskId: completed.id } })).toBe(0);
  });

  it("rejects missing or unfinished tasks without storing a review", async () => {
    expect((await review(post("reviews", { taskId: "missing", rating: 5 }))).status).toBe(404);
    const active = await task("ASSIGNED");
    expect((await review(post("reviews", { taskId: active.id, rating: 5 }))).status).toBe(409);
    expect(await prisma.review.count({ where: { taskId: active.id } })).toBe(0);
  });

  it("persists a dispute and freezes the assignment and payment", async () => {
    const submitted = await task("AWAITING_CONFIRMATION");
    const paid = await payment(submitted.id);
    const response = await dispute(post("disputes", { taskId: submitted.id, reason: "Deliverable is incomplete", openedById: ids.outsider }));
    expect(response.status).toBe(201);
    const { data } = await response.json();
    expect(await prisma.dispute.findUnique({ where: { id: data.disputeId } })).toMatchObject({ taskId: submitted.id, openedById: ids.poster, status: "OPEN", reason: "Deliverable is incomplete" });
    expect((await prisma.task.findUniqueOrThrow({ where: { id: submitted.id } })).status).toBe("DISPUTED");
    expect((await prisma.assignment.findUniqueOrThrow({ where: { taskId: submitted.id } })).status).toBe("DISPUTED");
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: paid.id } })).status).toBe("DISPUTED");
    expect((await prisma.payout.findUniqueOrThrow({ where: { paymentId: paid.id } })).releasedAt).toBeNull();
    expect((await dispute(post("disputes", { taskId: submitted.id, reason: "Duplicate attempt" }))).status).toBe(409);
    expect(await prisma.dispute.count({ where: { taskId: submitted.id } })).toBe(1);
  });

  it("denies an outsider's dispute without changing task state", async () => {
    const submitted = await task("AWAITING_CONFIRMATION");
    signIn(ids.outsider);
    expect((await dispute(post("disputes", { taskId: submitted.id, reason: "Unauthorized attempt" }))).status).toBe(403);
    expect(await prisma.dispute.count({ where: { taskId: submitted.id } })).toBe(0);
    expect((await prisma.task.findUniqueOrThrow({ where: { id: submitted.id } })).status).toBe("AWAITING_CONFIRMATION");
  });

  it("rejects a dispute after payout release", async () => {
    const completed = await task("COMPLETED");
    await payment(completed.id, true);
    expect((await dispute(post("disputes", { taskId: completed.id, reason: "Too late for a dispute" }))).status).toBe(409);
    expect(await prisma.dispute.count({ where: { taskId: completed.id } })).toBe(0);
  });

  it("returns stored public facts and excludes blind/future reviews and private fields", async () => {
    await prisma.profile.create({ data: { userId: ids.tasker, skills: ["Delivery"], contactNumber: "private-contact", locationLabel: "private-location", latitude: 14.5, longitude: 121 } });
    await prisma.taskerVerification.create({ data: { userId: ids.tasker, status: "VERIFIED", rejectionReason: "private-history", appealNote: "private-note" } });
    const visible = await task("COMPLETED");
    const blind = await task("COMPLETED");
    const future = await task("COMPLETED");
    const posted = await task("COMPLETED", ids.tasker, ids.poster);
    await task("DRAFT", ids.tasker, ids.poster);
    await prisma.review.createMany({ data: [
      { taskId: visible.id, reviewerId: ids.poster, revieweeId: ids.tasker, rating: 5, publishedAt: past },
      { taskId: blind.id, reviewerId: ids.poster, revieweeId: ids.tasker, rating: 1, comment: "private-review" },
      { taskId: future.id, reviewerId: ids.poster, revieweeId: ids.tasker, rating: 1, publishedAt: new Date("2100-01-01") },
      { taskId: posted.id, reviewerId: ids.poster, revieweeId: ids.tasker, rating: 3, publishedAt: past },
    ] });
    const response = await getProfile(ids.tasker);
    expect(await response.json()).toEqual({ data: {
      id: ids.tasker, name: "Stored tasker", verificationStatus: "verified", taskerRating: 5, posterRating: 3,
      completedTasks: 3, postedTasks: 1, skills: ["Delivery"],
    } });
  });

  it("uses null ratings, empty skills and no verified badge for a new account", async () => {
    const response = await getProfile(ids.outsider);
    expect((await response.json()).data).toMatchObject({ taskerRating: null, posterRating: null, completedTasks: 0, postedTasks: 0, skills: [], verificationStatus: "not_verified" });
  });

  it("returns 404 for nonexistent and suspended accounts", async () => {
    expect((await getProfile("missing")).status).toBe(404);
    await prisma.user.update({ where: { id: ids.tasker }, data: { status: "SUSPENDED" } });
    expect((await getProfile(ids.tasker)).status).toBe(404);
  });
});
