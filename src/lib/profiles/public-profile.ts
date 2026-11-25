import { prisma } from "@/lib/prisma";

/** Public marketplace facts only; never return account/contact/location details. */
export async function getPublicProfile(userId: string, now = new Date()) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      status: true,
      profile: { select: { skills: true } },
      taskerVerification: { select: { status: true } },
    },
  });
  if (!user || user.status === "SUSPENDED") return null;

  const publishedReviews = { revieweeId: user.id, publishedAt: { lte: now } };
  const [taskerReviews, posterReviews, completedTasks, postedTasks] = await Promise.all([
    prisma.review.aggregate({
      where: { ...publishedReviews, task: { status: "COMPLETED", assignment: { taskerId: user.id } } },
      _avg: { rating: true },
    }),
    prisma.review.aggregate({
      where: { ...publishedReviews, task: { status: "COMPLETED", posterId: user.id } },
      _avg: { rating: true },
    }),
    prisma.assignment.count({
      where: { taskerId: user.id, status: "COMPLETED", task: { status: "COMPLETED" } },
    }),
    prisma.task.count({ where: { posterId: user.id, publishedAt: { not: null } } }),
  ]);

  return {
    id: user.id,
    name: user.name,
    verificationStatus: user.taskerVerification?.status === "VERIFIED" ? "verified" : "not_verified",
    taskerRating: taskerReviews._avg.rating,
    posterRating: posterReviews._avg.rating,
    completedTasks,
    postedTasks,
    skills: user.profile?.skills ?? [],
  };
}
