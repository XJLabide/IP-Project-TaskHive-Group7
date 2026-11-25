import { Prisma } from "@prisma/client";
import type { SupportQueue } from "./service";
import { REVIEW_TARGET_BUSINESS_DAYS, reviewDueAt } from "./rules";
import { adminRead } from "./performance";
import { ADMIN_PAGE_SIZE, adminPage, adminSections, type AdminPages, type AdminSection } from "./pagination";

const open = Prisma.sql`t.status IN ('OPEN', 'REVIEWING')`;
const definitions = {
  reports: {
    table: Prisma.sql`"Report"`, where: open, date: Prisma.sql`t."createdAt"`, key: Prisma.sql`t.id`, descending: false,
    joins: Prisma.sql`JOIN "User" u ON u.id = t."reporterId" LEFT JOIN "User" reported ON reported.id = t."reportedUserId" LEFT JOIN "Task" task ON task.id = t."taskId" LEFT JOIN "ChatMessage" message ON message.id = t."messageId"`,
    columns: Prisma.sql`t.id, t.reason, t.status, t."createdAt", u.name AS reporter, reported.name AS "reportedUser", task.title AS "taskTitle", message.body AS "messageBody"`,
  },
  disputes: {
    table: Prisma.sql`"Dispute"`, where: open, date: Prisma.sql`t."createdAt"`, key: Prisma.sql`t.id`, descending: false,
    joins: Prisma.sql`JOIN "User" u ON u.id = t."openedById" JOIN "Task" task ON task.id = t."taskId" LEFT JOIN "Assignment" assignment ON assignment."taskId" = task.id`,
    columns: Prisma.sql`t.id, t."taskId", t.reason, t.status, t."createdAt", t."reviewDueAt" AS "dueAt", u.name AS "openedBy", task.title AS "taskTitle", assignment."completionNote" AS "evidenceNote", assignment."completionUrl" AS "evidenceUrl"`,
  },
  cancellations: {
    table: Prisma.sql`"CancellationRequest"`, where: open, date: Prisma.sql`t."createdAt"`, key: Prisma.sql`t.id`, descending: false,
    joins: Prisma.sql`JOIN "User" u ON u.id = t."requestedById" JOIN "Task" task ON task.id = t."taskId" LEFT JOIN "Assignment" assignment ON assignment."taskId" = task.id`,
    columns: Prisma.sql`t.id, t."taskId", t.reason, t.status, t."createdAt", t."reviewDueAt" AS "dueAt", u.name AS "requestedBy", task.title AS "taskTitle", assignment."completionNote" AS "evidenceNote", assignment."completionUrl" AS "evidenceUrl"`,
  },
  verificationAppeals: {
    table: Prisma.sql`"TaskerVerification"`, where: Prisma.sql`t."appealStatus" = 'PENDING'`, date: Prisma.sql`t."appealedAt"`, key: Prisma.sql`t."userId"`, descending: false,
    joins: Prisma.sql`JOIN "User" u ON u.id = t."userId"`,
    columns: Prisma.sql`t."userId", t."appealedAt", t."appealNote", u.name`,
  },
  recentTasks: {
    table: Prisma.sql`"Task"`, where: Prisma.sql`TRUE`, date: Prisma.sql`t."updatedAt"`, key: Prisma.sql`t.id`, descending: true,
    joins: Prisma.sql`JOIN "User" u ON u.id = t."posterId"`,
    columns: Prisma.sql`t.id, t.title, t.status, t."updatedAt", u.name AS poster`,
  },
  recentUsers: {
    table: Prisma.sql`"User"`, where: Prisma.sql`t."isAdmin" = FALSE`, date: Prisma.sql`t."updatedAt"`, key: Prisma.sql`t.id`, descending: true,
    joins: Prisma.empty,
    columns: Prisma.sql`t.id, t.name, t.status, t."isAdmin", t."updatedAt"`,
  },
  recentDecisions: {
    table: Prisma.sql`"AdminAction"`, where: Prisma.sql`TRUE`, date: Prisma.sql`t."createdAt"`, key: Prisma.sql`t.id`, descending: true,
    joins: Prisma.sql`JOIN "User" u ON u.id = t."adminId"`,
    columns: Prisma.sql`t.id, t.action, t."targetType", t."targetId", t.notes, t.metadata, t."createdAt", u.name AS admin`,
  },
} satisfies Record<AdminSection, { table: Prisma.Sql; where: Prisma.Sql; date: Prisma.Sql; key: Prisma.Sql; descending: boolean; joins: Prisma.Sql; columns: Prisma.Sql }>;

export type AdminPagination = { page: number; pageSize: number; total: number; totalPages: number };
export type AdminSectionPage<K extends AdminSection> = { items: SupportQueue[K]; pagination: AdminPagination };
export type AdminTotals = SupportQueue["totals"] & { platformFeesCents: number };

/** A single SQL statement counts and returns a bounded, deterministically ordered
 * page. Joins happen after limiting; a resolved/deleted last page clamps safely.
 */
export async function getAdminSection<K extends AdminSection>(section: K, requestedPage = 1): Promise<AdminSectionPage<K>> {
  const page = adminPage(requestedPage);
  const def = definitions[section];
  const direction = def.descending ? Prisma.sql`DESC` : Prisma.sql`ASC`;
  const [result] = await adminRead(section, (db) => db.$queryRaw<Array<{ total: number; page: number; items: Array<Record<string, unknown>> }>>(Prisma.sql`
    WITH stats AS MATERIALIZED (
      SELECT count(*)::int AS total FROM ${def.table} t WHERE ${def.where}
    ), bounds AS (
      SELECT total, LEAST(${page}::int, GREATEST(1, ceil(total::numeric / ${ADMIN_PAGE_SIZE})::int)) AS page FROM stats
    ), limited AS (
      SELECT t.* FROM ${def.table} t WHERE ${def.where}
      ORDER BY ${def.date} ${direction} NULLS LAST, ${def.key} ${direction}
      LIMIT ${ADMIN_PAGE_SIZE} OFFSET (SELECT (page - 1) * ${ADMIN_PAGE_SIZE} FROM bounds)
    )
    SELECT total, page, COALESCE((
      SELECT jsonb_agg(to_jsonb(item) ORDER BY item."__date" ${direction} NULLS LAST, item."__key" ${direction})
      FROM (SELECT ${def.columns}, ${def.date} AS "__date", ${def.key} AS "__key" FROM limited t ${def.joins}) item
    ), '[]'::jsonb) AS items FROM bounds
  `));

  const items = result.items.map((record) => {
    const { __date, __key, ...item } = record;
    void __date; void __key;
    for (const key of ["createdAt", "updatedAt", "appealedAt", "dueAt"]) {
      if (typeof item[key] === "string") {
        // Prisma's PostgreSQL DateTime columns are UTC timestamps without a
        // zone. JSON serialization omits Z; do not reinterpret them as local time.
        const value = item[key] as string;
        item[key] = new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`);
      }
    }
    if (section === "reports" || section === "disputes") item.dueAt ??= reviewDueAt(item.createdAt as Date);
    if (section === "verificationAppeals") item.dueAt = reviewDueAt((item.appealedAt as Date | null) ?? new Date());
    return item;
  }) as SupportQueue[K];
  return { items, pagination: { page: result.page, pageSize: ADMIN_PAGE_SIZE, total: result.total, totalPages: Math.max(1, Math.ceil(result.total / ADMIN_PAGE_SIZE)) } };
}

/** Counts never depend on the visible page and share one database round trip. */
export async function getAdminTotals(includePlatformFees = false): Promise<AdminTotals> {
  const [totals] = await adminRead("totals", (db) => db.$queryRaw<AdminTotals[]>`
    SELECT
      (SELECT count(*)::int FROM "User") AS users,
      tasks.total AS tasks, tasks.completed AS "completedTasks",
      (SELECT count(*)::int FROM "Report" WHERE status IN ('OPEN', 'REVIEWING')) AS "openReports",
      (SELECT count(*)::int FROM "Dispute" WHERE status IN ('OPEN', 'REVIEWING')) AS "openDisputes",
      (SELECT count(*)::int FROM "CancellationRequest" WHERE status IN ('OPEN', 'REVIEWING')) AS "openCancellations",
      (SELECT count(*)::int FROM "TaskerVerification" WHERE "appealStatus" = 'PENDING') AS "pendingVerificationAppeals",
      ${includePlatformFees ? Prisma.sql`(SELECT COALESCE(sum("platformFeeCents"), 0)::float8 FROM "Payment" WHERE status = 'RELEASED')` : Prisma.sql`0::float8`} AS "platformFeesCents"
    FROM (SELECT count(*)::int AS total, count(*) FILTER (WHERE status = 'COMPLETED')::int AS completed FROM "Task") tasks
  `);
  return totals;
}

/** Compatibility API: all sections are bounded. The page streams the readers
 * separately instead of waiting for this aggregate response.
 */
export async function listSupportQueue(pages: AdminPages = {}): Promise<SupportQueue & { pagination: Record<AdminSection, AdminPagination> }> {
  const [totals, sections] = await Promise.all([
    getAdminTotals(),
    Promise.all(adminSections.map(async (section) => [section, await getAdminSection(section, pages[section])] as const)),
  ]);
  const data = Object.fromEntries(sections.map(([section, result]) => [section, result.items]));
  const pagination = Object.fromEntries(sections.map(([section, result]) => [section, result.pagination])) as Record<AdminSection, AdminPagination>;
  const { platformFeesCents, ...queueTotals } = totals;
  void platformFeesCents;
  return { ...data, reviewTargetBusinessDays: REVIEW_TARGET_BUSINESS_DAYS, totals: queueTotals, pagination } as SupportQueue & { pagination: Record<AdminSection, AdminPagination> };
}
