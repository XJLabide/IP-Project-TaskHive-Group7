import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ after: () => {} }));
const client = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL, log: [{ emit: "event", level: "query" }] });
(globalThis as unknown as { prisma: typeof client }).prisma = client;
const { listSupportQueue } = await import("./service");
const { getAdminSection, getAdminTotals } = await import("./reads");
let statements = 0;
client.$on("query", () => { statements++; });
const prefix = "admin-performance-fixture";
const amount = 400;
const stamp = new Date("2026-11-01T08:00:00Z");
const reason = "Disposable performance fixture. ".repeat(65);

beforeAll(async () => {
  // Explicit disposable URL only. A stable prefix lets subsequent runs reuse
  // the same dataset, and afterAll cleans up all fixture-owned rows.
  await client.user.createMany({ data: Array.from({ length: amount + 1 }, (_, i) => ({ id: `${prefix}-user-${i}`, name: `Test member ${i}`, email: `${prefix}-${i}@example.invalid`, isAdmin: i === amount })), skipDuplicates: true });
  await client.task.createMany({ data: Array.from({ length: amount * 2 }, (_, i) => ({ id: `${prefix}-task-${i}`, posterId: `${prefix}-user-${amount}`, title: `Test task ${i}`, description: reason, budgetCents: 10000, status: "OPEN" as const, fulfillmentMode: "REMOTE" as const, hiringMode: "FIXED_PRICE" as const })), skipDuplicates: true });
  await client.report.createMany({ data: Array.from({ length: amount }, (_, i) => ({ id: `${prefix}-report-${i}`, reporterId: `${prefix}-user-${i}`, reason, createdAt: stamp })), skipDuplicates: true });
  await client.dispute.createMany({ data: Array.from({ length: amount }, (_, i) => ({ id: `${prefix}-dispute-${i}`, taskId: `${prefix}-task-${i}`, openedById: `${prefix}-user-${i}`, reason, createdAt: stamp })), skipDuplicates: true });
  await client.cancellationRequest.createMany({ data: Array.from({ length: amount }, (_, i) => ({ id: `${prefix}-cancellation-${i}`, taskId: `${prefix}-task-${amount + i}`, requestedById: `${prefix}-user-${i}`, reason, createdAt: stamp, reviewDueAt: stamp })), skipDuplicates: true });
  await client.taskerVerification.createMany({ data: Array.from({ length: amount }, (_, i) => ({ userId: `${prefix}-user-${i}`, status: "REJECTED" as const, appealStatus: "PENDING" as const, appealCount: 1, appealedAt: stamp, appealNote: reason })), skipDuplicates: true });
});
afterAll(async () => {
  if (process.env.ADMIN_KEEP_FIXTURES !== "1") await client.user.deleteMany({ where: { id: { startsWith: prefix } } });
  await client.$disconnect();
});

it("profiles the real support dashboard with a two-connection pool", async () => {
  await listSupportQueue();
  // Prisma query events are delivered asynchronously. Settle the event bridge
  // outside the timed interval so the last statement is not undercounted.
  await new Promise(resolve => setTimeout(resolve, 10));
  const samples: number[] = [];
  let bytes = 0;
  let count = 0;
  for (let i = 0; i < 5; i++) {
    statements = 0;
    const start = performance.now();
    const queue = await listSupportQueue();
    samples.push(performance.now() - start);
    await new Promise(resolve => setTimeout(resolve, 10));
    count = statements;
    bytes = Buffer.byteLength(JSON.stringify(queue));
    expect(queue.totals.openReports).toBe(amount);
    expect(queue.reports).toHaveLength(10);
    expect(queue.disputes).toHaveLength(10);
    expect(queue.cancellations).toHaveLength(10);
    expect(queue.verificationAppeals).toHaveLength(10);
    expect(queue.pagination.reports).toEqual({ page: 1, pageSize: 10, total: amount, totalPages: 40 });
    expect(count).toBe(8);
  }
  const result = { samplesMs: samples, statements: count, bytes, openRecords: amount * 4 };
  console.log("ADMIN_BENCHMARK", JSON.stringify(result));
  if (process.env.ADMIN_BENCHMARK_OUTPUT) writeFileSync(process.env.ADMIN_BENCHMARK_OUTPUT, JSON.stringify(result, null, 2));
});

it("orders tied timestamps consistently across disjoint pages", async () => {
  const first = await getAdminSection("reports");
  const second = await getAdminSection("reports", 2);
  expect(first.items.map(item => item.id)).toEqual([...first.items.map(item => item.id)].sort());
  expect(second.items.every(item => !first.items.some(previous => previous.id === item.id))).toBe(true);
  expect(first.items[0].createdAt).toEqual(stamp);
  expect((await getAdminSection("verificationAppeals")).items[0].appealedAt).toEqual(stamp);
});

it("clamps an out-of-date page and keeps totals independent from visible rows", async () => {
  const page = await getAdminSection("cancellations", 2147483647);
  expect(page.pagination.page).toBe(40);
  expect(page.items).toHaveLength(10);
  const totals = await getAdminTotals();
  expect(totals).toMatchObject({ openReports: amount, openDisputes: amount, openCancellations: amount, pendingVerificationAppeals: amount, tasks: amount * 2, platformFeesCents: 0 });
});

it("paginates every oversight section without returning Admin accounts as participants", async () => {
  const users = await getAdminSection("recentUsers", 2);
  expect(users.items).toHaveLength(10);
  expect(users.items.every(user => user.isAdmin === false && user.updatedAt instanceof Date)).toBe(true);
  expect((await getAdminSection("recentTasks", 2)).items).toHaveLength(10);
  expect((await getAdminSection("recentDecisions")).pagination.total).toBe(0);
});

it("excludes resolved reports without losing exact counts", async () => {
  const id = `${prefix}-report-0`;
  await client.report.update({ where: { id }, data: { status: "RESOLVED" } });
  try {
    const page = await getAdminSection("reports");
    expect(page.pagination.total).toBe(amount - 1);
    expect(page.items.some(item => item.id === id)).toBe(false);
  } finally { await client.report.update({ where: { id }, data: { status: "OPEN" } }); }
});

it("preserves nullable appeal dates and UTC due dates", async () => {
  const userId = `${prefix}-user-0`;
  await client.taskerVerification.update({ where: { userId }, data: { appealedAt: null } });
  try {
    const last = await getAdminSection("verificationAppeals", 40);
    expect(last.items.at(-1)).toMatchObject({ userId, appealedAt: null });
    expect(last.items.at(-1)?.dueAt).toBeInstanceOf(Date);
    const cancellations = await getAdminSection("cancellations");
    expect(cancellations.items[0].createdAt).toEqual(stamp);
    expect(cancellations.items[0].dueAt).toEqual(stamp);
  } finally { await client.taskerVerification.update({ where: { userId }, data: { appealedAt: stamp } }); }
});

it("reads released platform fees only for the overview API that requests them", async () => {
  const payment = await client.payment.create({ data: {
    taskId: `${prefix}-task-0`, posterId: `${prefix}-user-${amount}`,
    amountCents: 10000, platformFeeCents: 500, status: "RELEASED",
  } });
  try {
    expect((await getAdminTotals()).platformFeesCents).toBe(0);
    expect((await getAdminTotals(true)).platformFeesCents).toBe(500);
  } finally { await client.payment.delete({ where: { id: payment.id } }); }
});

it("records connection acquisition separately when both pool slots are occupied", async () => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  vi.stubEnv("ADMIN_QUERY_DIAGNOSTICS", "1");
  let release!: () => void;
  const released = new Promise<void>(resolve => { release = resolve; });
  let locked = 0;
  let bothLocked!: () => void;
  const acquired = new Promise<void>(resolve => { bothLocked = resolve; });
  const holds = [0, 1].map(() => client.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1`;
    if (++locked === 2) bothLocked();
    await released;
  }));
  try {
    await acquired;
    const result = getAdminTotals();
    setTimeout(release, 60);
    expect((await result).openReports).toBe(amount);
    const entry = log.mock.calls.find(call => call[1]?.section === "totals")?.[1];
    expect(entry).toMatchObject({ outcome: "ok" });
    expect(entry.acquisitionMs).toBeGreaterThan(30);
    expect(entry.queryMs).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(entry)).not.toMatch(/postgresql:|Disposable performance fixture|example.invalid/);
  } finally {
    release();
    await Promise.all(holds);
    log.mockRestore(); vi.unstubAllEnvs();
  }
});
