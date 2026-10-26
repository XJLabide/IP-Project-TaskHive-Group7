import type {
  FulfillmentMode as DbFulfillmentMode,
  HiringMode as DbHiringMode,
  PaymentStatus as DbPaymentStatus,
  Prisma,
  TaskStatus as DbTaskStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  applySearchArea,
  canViewPublicTask,
  paginate,
  sortPublicTasks,
  toPublicTaskDetail,
  toPublicTaskSummary,
  type DiscoverableTask,
  type PublicTaskDetail,
  type PublicTaskSummary,
} from "./discovery";
import { matchesPublicFilters, type PublicTaskQuery } from "./discovery-query";
import type { PaymentState } from "./address-access";
import { resolveSearchArea, type SearchArea } from "./location";
import {
  toDbFulfillment,
  toDbHiring,
  toDomainFulfillment,
  toDomainHiring,
  toDomainTaskStatus,
} from "./mapping";

/** Prisma payment statuses translated into the discovery vocabulary. */
const toDomainPayment: Record<DbPaymentStatus, PaymentState> = {
  UNPAID: "unpaid",
  CHECKOUT_STARTED: "checkout_started",
  PAID_PENDING_COMPLETION: "paid_pending_completion",
  RELEASED: "released",
  REFUNDED: "refunded",
  DISPUTED: "disputed",
};

type TaskRow = {
  id: string;
  posterId: string;
  title: string;
  description: string;
  budgetCents: number;
  currency: string;
  deadline: Date | null;
  publishedAt: Date | null;
  locationLabel: string | null;
  addressLine: string | null;
  latitude: number | null;
  longitude: number | null;
  fulfillmentMode: DbFulfillmentMode;
  hiringMode: DbHiringMode;
  status: DbTaskStatus;
  category: { name: string } | null;
  poster: { name: string } | null;
};

export type PublicTaskList = {
  tasks: PublicTaskSummary[];
  searchArea: SearchArea;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

function toDiscoverable(row: TaskRow): DiscoverableTask {
  return {
    id: row.id,
    posterId: row.posterId,
    posterName: row.poster?.name ?? null,
    title: row.title,
    description: row.description,
    category: row.category?.name ?? null,
    budgetCents: row.budgetCents,
    currency: row.currency,
    deadline: row.deadline,
    publishedAt: row.publishedAt,
    status: toDomainTaskStatus[row.status],
    fulfillmentMode: toDomainFulfillment[row.fulfillmentMode],
    hiringMode: toDomainHiring[row.hiringMode],
    areaLabel: row.locationLabel,
    exactAddress: row.addressLine,
    latitude: row.latitude,
    longitude: row.longitude,
  };
}

/**
 * Coarse SQL pre-filter. `matchesPublicFilters` stays authoritative so the API
 * and the database cannot drift on search or category semantics.
 */
function whereFor(query: PublicTaskQuery): Prisma.TaskWhereInput {
  const { filters } = query;
  const search = filters.search;

  const budget =
    filters.budgetMinCents !== null || filters.budgetMaxCents !== null
      ? {
          ...(filters.budgetMinCents !== null ? { gte: filters.budgetMinCents } : {}),
          ...(filters.budgetMaxCents !== null ? { lte: filters.budgetMaxCents } : {}),
        }
      : undefined;

  return {
    status: "OPEN",
    ...(filters.fulfillmentMode
      ? { fulfillmentMode: toDbFulfillment[filters.fulfillmentMode] }
      : {}),
    ...(filters.hiringMode ? { hiringMode: toDbHiring[filters.hiringMode] } : {}),
    ...(budget ? { budgetCents: budget } : {}),
    ...(filters.category ? { category: { is: { name: filters.category } } } : {}),
    ...(filters.deadlineBefore ? { deadline: { lte: filters.deadlineBefore } } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
            { locationLabel: { contains: search, mode: "insensitive" as const } },
            {
              category: {
                is: { name: { contains: search, mode: "insensitive" as const } },
              },
            },
          ],
        }
      : {}),
  };
}

async function savedArea(userId: string | null) {
  if (!userId) return null;

  return prisma.profile.findUnique({
    where: { userId },
    select: { latitude: true, longitude: true, locationLabel: true },
  });
}

/** The public discovery feed. Guests browse nationwide; accounts default to home. */
export async function listPublicTasks(
  query: PublicTaskQuery,
  viewerId: string | null,
): Promise<PublicTaskList> {
  const saved = query.origin ? null : await savedArea(viewerId);
  const searchArea = resolveSearchArea({
    chosen: {
      latitude: query.origin?.latitude ?? null,
      longitude: query.origin?.longitude ?? null,
      radiusKm: query.radiusKm,
    },
    saved: saved
      ? {
          latitude: saved.latitude,
          longitude: saved.longitude,
          label: saved.locationLabel,
        }
      : null,
  });

  const rows = await prisma.task.findMany({
    where: whereFor(query),
    include: {
      category: { select: { name: true } },
      poster: { select: { name: true } },
    },
    orderBy: { publishedAt: "desc" },
  });

  const matched = rows
    .map((row) => toDiscoverable(row as TaskRow))
    .filter((task) => matchesPublicFilters(task, query.filters));

  const ranked = sortPublicTasks(applySearchArea(matched, searchArea), query.sort);
  const page = paginate(ranked, query.page, query.pageSize);

  return {
    tasks: page.items.map((item) => toPublicTaskSummary(item.task, item.distanceKm)),
    searchArea,
    pagination: {
      total: page.total,
      page: page.page,
      pageSize: page.pageSize,
      totalPages: page.totalPages,
    },
  };
}

/** The public detail view; the exact address is gated on payment and assignment. */
export async function getPublicTaskDetail(
  taskId: string,
  viewerId: string | null,
): Promise<PublicTaskDetail | null> {
  const row = await prisma.task.findFirst({
    where: { id: taskId },
    include: {
      category: { select: { name: true } },
      poster: { select: { name: true } },
      assignment: { select: { taskerId: true } },
      payments: { select: { status: true } },
    },
  });

  if (!row) return null;

  const task = toDiscoverable(row as TaskRow);
  const assignmentTaskerId = row.assignment?.taskerId ?? null;

  if (!canViewPublicTask(task, viewerId, assignmentTaskerId)) return null;

  return toPublicTaskDetail(task, {
    posterId: task.posterId,
    viewerId,
    assignmentTaskerId,
    taskStatus: task.status,
    paymentStatuses: row.payments.map(
      (payment) => toDomainPayment[payment.status] ?? "unpaid",
    ),
    hasAddress: Boolean(task.exactAddress),
  });
}
