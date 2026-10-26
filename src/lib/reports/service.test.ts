import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { report: { findMany: vi.fn() } },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { listReportedMessages } from "./service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("admin report review", () => {
  it("returns the reported message with its sender and task", async () => {
    prismaMock.report.findMany.mockResolvedValue([
      {
        id: "report_1",
        reason: "Abusive language",
        status: "OPEN",
        createdAt: new Date("2026-10-26T08:00:00.000Z"),
        reporter: { name: "Ana Reyes" },
        reportedUser: { name: "Jose Reyes" },
        task: { id: "task_1", title: "Pick up groceries" },
        message: {
          id: "msg_1",
          body: "Inappropriate message",
          createdAt: new Date("2026-10-26T07:59:00.000Z"),
          sender: { name: "Jose Reyes" },
        },
      },
    ]);

    const reports = await listReportedMessages();

    expect(reports[0]).toMatchObject({
      id: "report_1",
      reporterName: "Ana Reyes",
      reportedName: "Jose Reyes",
      task: { id: "task_1", title: "Pick up groceries" },
      message: { id: "msg_1", body: "Inappropriate message", senderName: "Jose Reyes" },
    });
    expect(prismaMock.report.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "OPEN" } }),
    );
  });
});
