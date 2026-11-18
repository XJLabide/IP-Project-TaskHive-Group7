import { prisma } from "@/lib/prisma";
import { toDomainFulfillment, toDomainHiring, toDomainTaskStatus } from "./mapping";
import type { TaskSummary } from "./types";

/** Lists the signed-in Poster’s own tasks, including private drafts. */
export async function listOwnedTasks(posterId: string): Promise<TaskSummary[]> {
  const tasks = await prisma.task.findMany({
    where: { posterId },
    include: {
      category: { select: { name: true } },
      poster: { select: { name: true } },
      _count: {
        select: {
          bids: { where: { status: { in: ["SUBMITTED", "ACCEPTED"] } } },
          taskRequests: { where: { status: { in: ["SUBMITTED", "ACCEPTED"] } } },
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });

  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    category: task.category?.name ?? "",
    fulfillmentMode: toDomainFulfillment[task.fulfillmentMode],
    hiringMode: toDomainHiring[task.hiringMode],
    budget: task.budgetCents / 100,
    location: task.locationLabel,
    addressLine: task.addressLine,
    latitude: task.latitude,
    longitude: task.longitude,
    deadline: task.deadline?.toISOString() ?? "",
    status: toDomainTaskStatus[task.status],
    poster: task.poster?.name ?? "Poster",
    applications: task._count.bids + task._count.taskRequests,
  }));
}
