import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { listApplicationsForTasker } from "@/lib/applications/service";
import { listSupportQueue } from "@/lib/support/service";
import { applyProviderResult, applyVerificationEvent, decideAppeal, getVerification, submitAppeal, type VerificationResult } from "./service";

// Keep real inbox persistence, but do not schedule external email delivery from
// this service-level test (there is no Next.js response lifecycle here).
vi.mock("next/server", () => ({ after: () => {} }));

const coordinator = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
const uploadedTestDocument = {
  publicId: "taskhive/verification/test-fixture",
  format: "png",
  uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
  consentedAt: new Date("2026-01-01T00:00:00.000Z"),
};
let userId = "";
let fixtureUserIds: string[] = [];

async function createUser(isAdmin = false) {
  const user = await prisma.user.create({
    data: { name: "Verification test member", email: `${randomUUID()}@example.invalid`, isAdmin },
  });
  fixtureUserIds.push(user.id);
  return user.id;
}

async function createApplications() {
  const posterId = await createUser();
  const task = { posterId, title: "Verification test task", description: "Disposable fixture", budgetCents: 10000, fulfillmentMode: "REMOTE" as const, status: "OPEN" as const };
  await prisma.task.create({ data: {
    ...task,
    hiringMode: "BIDDING",
    bids: { create: { taskerId: userId, amountCents: 10000, message: "Test bid" } },
  } });
  await prisma.task.create({ data: {
    ...task,
    hiringMode: "FIXED_PRICE",
    taskRequests: { create: { taskerId: userId, message: "Test request" } },
  } });
}

beforeEach(async () => {
  userId = "";
  fixtureUserIds = [];
  userId = await createUser();
});

afterEach(async () => {
  await prisma.user.deleteMany({ where: { id: { in: fixtureUserIds } } });
});
afterAll(async () => {
  await Promise.all([prisma.$disconnect(), coordinator.$disconnect()]);
});

/** Hold writes until both requests have read the same verification snapshot. */
async function overlap(operations: Array<() => Promise<VerificationResult>>) {
  let pending: Promise<PromiseSettledResult<VerificationResult>[]> | undefined;
  try {
    await coordinator.$transaction(async (tx) => {
      await tx.$executeRaw`LOCK TABLE "TaskerVerification" IN SHARE MODE`;
      pending = Promise.allSettled(operations.map((operation) => operation()));
      await vi.waitFor(async () => {
        const [row] = await coordinator.$queryRaw<Array<{ waiting: bigint }>>`
          SELECT count(*) AS waiting FROM pg_stat_activity
          WHERE datname = current_database() AND wait_event_type = 'Lock'
            AND query LIKE '%TaskerVerification%'
        `;
        expect(Number(row.waiting)).toBe(operations.length);
      }, { timeout: 3_000, interval: 10 });
    });
  } finally {
    // Even a failed barrier releases the lock and settles every request before
    // fixture cleanup, so a failed regression cannot leave background writes.
    if (pending) await pending;
  }
  return Promise.all((await pending!).map((result) => {
    if (result.status === "rejected") throw result.reason;
    return result.value;
  }));
}

describe("verification transitions against PostgreSQL", () => {
  it.each([
    ["approved", "rejected"],
    ["approved", "approved"],
    ["rejected", "rejected"],
  ])("commits only one provider decision for concurrent %s / %s callbacks", async (first, second) => {
    await prisma.taskerVerification.create({ data: { userId, status: "PENDING" } });
    await createApplications();

    const results = await overlap([first, second].map((status, index) =>
      () => applyProviderResult(userId, { status, reference: `provider-ref-${index}`, reason: "Check failed" }),
    ));

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.find((result) => !result.ok)).toMatchObject({ ok: false, code: "invalid_transition" });
    const winner = results.find((result) => result.ok);
    expect(await getVerification(userId)).toEqual(winner?.ok ? winner.state : null);
    const applications = await listApplicationsForTasker(userId);
    expect(applications.map((application) => application.status)).toEqual(
      winner?.ok && winner.state.status === "rejected" ? ["withdrawn", "withdrawn"] : ["submitted", "submitted"],
    );
  });

  it.each([
    ["approved", "denied"],
    ["approved", "approved"],
    ["denied", "denied"],
  ] as const)("records only the winning Admin decision for concurrent %s / %s decisions", async (first, second) => {
    const adminIds = await Promise.all([createUser(true), createUser(true)]);
    await prisma.taskerVerification.create({
      data: { userId, status: "REJECTED", appealStatus: "PENDING", appealCount: 1 },
    });

    const results = await overlap([
      () => decideAppeal(userId, first, "First decision", adminIds[0]),
      () => decideAppeal(userId, second, "Second decision", adminIds[1]),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.find((result) => !result.ok)).toMatchObject({ ok: false, code: "invalid_transition" });
    const approved = (results[0].ok ? first : second) === "approved";
    expect(await getVerification(userId)).toMatchObject({
      status: approved ? "verified" : "rejected",
      appealStatus: approved ? "approved" : "denied",
      appealCount: 1,
    });
    const { recentDecisions } = await listSupportQueue();
    expect(recentDecisions.filter((decision) => decision.targetId === userId)).toMatchObject([
      {
        action: approved ? "verification.appeal.approved" : "verification.appeal.denied",
        notes: results[0].ok ? "First decision" : "Second decision",
        metadata: { outcome: approved ? "approved" : "denied" },
      },
    ]);
  });

  it.each([false, true])("accepts only one first submission (record already exists: %s)", async (exists) => {
    if (exists) await prisma.taskerVerification.create({ data: { userId } });
    const results = await overlap([
      () => applyVerificationEvent(userId, { type: "submitted" }, { document: uploadedTestDocument }),
      () => applyVerificationEvent(userId, { type: "submitted" }, { document: uploadedTestDocument }),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.find((result) => !result.ok)).toMatchObject({ ok: false, code: "invalid_transition" });
    expect(await getVerification(userId)).toMatchObject({ status: "pending", appealCount: 0, appealStatus: "none" });
  });

  it("accepts only one concurrent appeal submission", async () => {
    await prisma.taskerVerification.create({ data: { userId, status: "REJECTED" } });
    const results = await overlap([
      () => submitAppeal(userId, "First appeal"),
      () => submitAppeal(userId, "Second appeal"),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.find((result) => !result.ok)).toMatchObject({ ok: false, code: "invalid_transition" });
    expect(await getVerification(userId)).toMatchObject({ status: "rejected", appealCount: 1, appealStatus: "pending" });
  });

  it.each(["approved", "denied"] as const)("rejects late provider decisions after an appeal is %s", async (outcome) => {
    const adminId = await createUser(true);
    await createApplications();
    expect(await applyVerificationEvent(userId, { type: "submitted" }, { document: uploadedTestDocument })).toMatchObject({ ok: true });
    expect(await applyProviderResult(userId, { status: "rejected", reference: "initial-ref", reason: "Check failed" })).toMatchObject({ ok: true });
    expect(await submitAppeal(userId, "Please review")).toMatchObject({ ok: true });
    expect(await decideAppeal(userId, outcome, "Admin decision", adminId)).toMatchObject({ ok: true });

    const decided = await getVerification(userId);
    for (const status of ["approved", "rejected"]) {
      expect(await applyProviderResult(userId, { status, reference: "late-ref", reason: "Late rejection" }))
        .toMatchObject({ ok: false, code: "invalid_transition" });
    }
    expect(await getVerification(userId)).toEqual(decided);
    expect((await listApplicationsForTasker(userId)).map((application) => application.status)).toEqual(["withdrawn", "withdrawn"]);
    expect((await listSupportQueue()).recentDecisions.filter((decision) => decision.targetId === userId)).toHaveLength(1);
  });

  it("rolls back an appeal decision if its mandatory Admin audit cannot be saved", async () => {
    await prisma.taskerVerification.create({
      data: { userId, status: "REJECTED", appealStatus: "PENDING", appealCount: 1 },
    });
    await expect(decideAppeal(userId, "approved", "Cannot audit", "missing-admin"))
      .rejects.toMatchObject({ code: "P2003" });
    expect(await getVerification(userId)).toMatchObject({ status: "rejected", appealStatus: "pending", appealCount: 1 });
    expect((await listSupportQueue()).recentDecisions.filter((decision) => decision.targetId === userId)).toEqual([]);
  });
});
