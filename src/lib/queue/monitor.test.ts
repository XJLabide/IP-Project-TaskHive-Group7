import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    assignment: { count: vi.fn() },
    review: { count: vi.fn() },
    notification: { count: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { computeJobBacklog } from "./monitor";

describe("computeJobBacklog", () => {
  const now = new Date("2026-11-19T00:00:00.000Z");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zero counts when nothing is overdue", async () => {
    prismaMock.assignment.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    prismaMock.review.count.mockResolvedValueOnce(0);
    prismaMock.notification.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

    const result = await computeJobBacklog(now);

    expect(result).toEqual({
      expiredHolds: 0,
      dueReminders: 0,
      dueAutoRelease: 0,
      dueReviews: 0,
      pendingEmail: 0,
      failedEmail: 0,
    });
  });

  it("counts each backlog category with the scheduler's own filters", async () => {
    prismaMock.assignment.count
      .mockResolvedValueOnce(2) // expired holds
      .mockResolvedValueOnce(3) // due reminders
      .mockResolvedValueOnce(4); // due auto-release
    prismaMock.review.count.mockResolvedValueOnce(5); // due reviews
    prismaMock.notification.count
      .mockResolvedValueOnce(6) // pending email
      .mockResolvedValueOnce(7); // failed email

    const result = await computeJobBacklog(now);

    expect(result).toEqual({
      expiredHolds: 2,
      dueReminders: 3,
      dueAutoRelease: 4,
      dueReviews: 5,
      pendingEmail: 6,
      failedEmail: 7,
    });

    // The reminder cutoff is 24 hours before "now".
    expect(prismaMock.assignment.count).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          completedAt: { lte: new Date("2026-11-18T00:00:00.000Z") },
        }),
      }),
    );
  });
});
