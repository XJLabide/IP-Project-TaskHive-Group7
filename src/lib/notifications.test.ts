import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, publishJobMock, afterMock, afterCallbacks } = vi.hoisted(() => {
  const callbacks: Array<() => unknown> = [];
  return {
    prismaMock: {
      notification: { upsert: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    },
    publishJobMock: vi.fn(),
    afterCallbacks: callbacks,
    afterMock: vi.fn((callback: () => unknown) => {
      callbacks.push(callback);
    }),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/queue/qstash", () => ({ publishJob: publishJobMock }));
vi.mock("next/server", () => ({ after: afterMock }));

import { notifyUser } from "./notifications";

describe("marketplace notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    afterCallbacks.length = 0;
    prismaMock.notification.upsert.mockResolvedValue({
      id: "notification_1",
      emailStatus: "PENDING",
    });
    prismaMock.notification.findUnique.mockResolvedValue({
      id: "notification_1",
      emailStatus: "PENDING",
    });
    prismaMock.notification.update.mockResolvedValue({});
    publishJobMock.mockResolvedValue({ queued: true });
  });

  it("stores an inbox record and queues one email delivery keyed to that record", async () => {
    const result = await notifyUser({
      userId: "poster_1",
      type: "chat.message",
      title: "New message about a task",
      eventKey: "chat.message:message_1:poster_1",
      body: "A Tasker sent you a message.",
      href: "/my-work",
    });

    expect(prismaMock.notification.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventKey: expect.stringMatching(/^[a-f0-9]{64}$/) },
        create: expect.objectContaining({
          userId: "poster_1",
          type: "chat.message",
          title: "New message about a task",
          body: "A Tasker sent you a message.",
          href: "/my-work",
          emailStatus: "PENDING",
        }),
      }),
    );
    expect(result).toEqual({ persisted: true, delivery: "scheduled" });
    expect(afterMock).toHaveBeenCalledTimes(1);
    expect(publishJobMock).not.toHaveBeenCalled();
    await afterCallbacks[0]();
    expect(publishJobMock).toHaveBeenCalledWith(
      "notifications.deliver_email",
      { notificationId: "notification_1" },
      { deduplicationId: "notification_1", retries: 4 },
    );
  });

  it("does not queue another email when the same event has already been sent", async () => {
    prismaMock.notification.upsert.mockResolvedValue({
      id: "notification_1",
      emailStatus: "SENT",
    });

    const result = await notifyUser({
      userId: "poster_1",
      type: "chat.message",
      title: "New message about a task",
      eventKey: "chat.message:message_1:poster_1",
    });

    expect(prismaMock.notification.upsert).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ persisted: true, delivery: "complete" });
    expect(afterMock).not.toHaveBeenCalled();
    expect(publishJobMock).not.toHaveBeenCalled();
  });

  it("marks email delivery failed when the queue is unavailable without failing the event", async () => {
    publishJobMock.mockResolvedValue({
      queued: false,
      jobName: "notifications.deliver_email",
      reason: "QStash is not configured in this environment.",
    });

    const result = await notifyUser({
        userId: "poster_1",
        type: "application.bid",
        title: "New bid on your task",
        eventKey: "application:bid_1:created:poster_1",
      });
    expect(result).toEqual({ persisted: true, delivery: "scheduled" });
    await afterCallbacks[0]();

    expect(prismaMock.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "notification_1" },
        data: {
          emailStatus: "FAILED",
          emailError: "Email delivery could not be queued.",
        },
      }),
    );
  });

  it("reports an inbox persistence failure so retryable callers can recover", async () => {
    prismaMock.notification.upsert.mockRejectedValue(new Error("database unavailable"));

    await expect(
      notifyUser({
        userId: "poster_1",
        type: "completion.reminder",
        title: "Confirm completion",
        eventKey: "completion:reminder:assignment_1:poster_1",
      }),
    ).resolves.toEqual({ persisted: false, delivery: "not_scheduled" });

    expect(afterMock).not.toHaveBeenCalled();
  });
});
