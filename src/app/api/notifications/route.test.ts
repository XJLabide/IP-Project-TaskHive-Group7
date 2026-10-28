import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, requireUserMock } = vi.hoisted(() => ({
  prismaMock: {
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
  },
  requireUserMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/api/response", () => ({
  ok: (data: unknown) => Response.json({ data }),
  problem: (message: string, status: number) =>
    Response.json({ error: message }, { status }),
  requireUser: requireUserMock,
}));

import { GET } from "./route";
import { PATCH } from "./[id]/route";

describe("notification inbox API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue({
      session: { user: { id: "user_1" } },
      response: null,
    });
    prismaMock.notification.findMany.mockResolvedValue([]);
    prismaMock.notification.count.mockResolvedValue(0);
    prismaMock.notification.updateMany.mockResolvedValue({ count: 1 });
  });

  it("returns only the signed-in user's notifications and unread count", async () => {
    prismaMock.notification.findMany.mockResolvedValue([
      {
        id: "notification_1",
        type: "chat.message",
        title: "New message about a task",
        body: null,
        href: "https://unexpected.example/steal",
        readAt: null,
        createdAt: new Date("2026-10-28T08:00:00Z"),
      },
    ]);
    prismaMock.notification.count.mockResolvedValue(1);

    const response = await GET(new Request("http://localhost/api/notifications"));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user_1" } }),
    );
    expect(prismaMock.notification.count).toHaveBeenCalledWith({
      where: { userId: "user_1", readAt: null },
    });
    expect(result.data).toMatchObject({ unreadCount: 1 });
    expect(result.data.notifications[0].href).toBe("/my-work");
  });

  it("marks only an owned notification as read", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/notifications/notification_1", { method: "PATCH" }),
      { params: Promise.resolve({ id: "notification_1" }) },
    );

    expect(response.status).toBe(200);
    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "notification_1", userId: "user_1", readAt: null },
        data: { readAt: expect.any(Date) },
      }),
    );
  });

  it("does not reveal whether another user's notification exists", async () => {
    prismaMock.notification.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.notification.findFirst.mockResolvedValue(null);

    const response = await PATCH(
      new Request("http://localhost/api/notifications/private", { method: "PATCH" }),
      { params: Promise.resolve({ id: "private" }) },
    );

    expect(response.status).toBe(404);
    expect(prismaMock.notification.findFirst).toHaveBeenCalledWith({
      where: { id: "private", userId: "user_1" },
      select: { readAt: true },
    });
  });
});
