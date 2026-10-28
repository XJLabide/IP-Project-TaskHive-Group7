import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, sendMailMock } = vi.hoisted(() => ({
  prismaMock: {
    notification: { findUnique: vi.fn(), update: vi.fn() },
  },
  sendMailMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/email/send", () => ({ sendMail: sendMailMock }));

import { deliverNotificationEmail } from "./email";

describe("notification email delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://taskhive.example";
    prismaMock.notification.findUnique.mockResolvedValue({
      id: "notification_1",
      emailStatus: "PENDING",
      title: "New message about a task",
      body: "A Tasker sent you a message.",
      href: "/my-work",
      user: { email: "poster@example.com", emailVerified: true },
    });
    prismaMock.notification.update.mockResolvedValue({});
    sendMailMock.mockResolvedValue({ delivered: true });
  });

  it("sends to a verified address with a same-origin link and a stable idempotency key", async () => {
    await deliverNotificationEmail("notification_1");

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "poster@example.com",
        subject: "TaskHive: New message about a task",
        text: expect.stringContaining("https://taskhive.example/my-work"),
        idempotencyKey: "taskhive-notification-notification_1",
      }),
    );
    expect(prismaMock.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "notification_1" },
        data: expect.objectContaining({
          emailStatus: "SENT",
          emailSentAt: expect.any(Date),
          emailError: null,
        }),
      }),
    );
  });

  it("skips sending when the recipient has not verified their email", async () => {
    prismaMock.notification.findUnique.mockResolvedValue({
      id: "notification_1",
      emailStatus: "PENDING",
      title: "New message about a task",
      body: "A Tasker sent you a message.",
      href: "/my-work",
      user: { email: "poster@example.com", emailVerified: false },
    });

    await expect(deliverNotificationEmail("notification_1")).resolves.toEqual({
      status: "SKIPPED",
    });

    expect(sendMailMock).not.toHaveBeenCalled();
    expect(prismaMock.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { emailStatus: "SKIPPED", emailError: null },
      }),
    );
  });

  it("records provider failures and throws so QStash retries", async () => {
    sendMailMock.mockRejectedValue(new Error("provider unavailable"));

    await expect(deliverNotificationEmail("notification_1")).rejects.toThrow(
      "Notification email delivery failed.",
    );

    expect(prismaMock.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          emailStatus: "FAILED",
          emailError: "Email delivery failed; queued retries may try again.",
        }),
      }),
    );
  });

  it("does not resend an email already marked sent", async () => {
    prismaMock.notification.findUnique.mockResolvedValue({
      id: "notification_1",
      emailStatus: "SENT",
      title: "New message about a task",
      body: "A Tasker sent you a message.",
      href: "/my-work",
      user: { email: "poster@example.com", emailVerified: true },
    });

    await expect(deliverNotificationEmail("notification_1")).resolves.toEqual({
      status: "SENT",
    });

    expect(sendMailMock).not.toHaveBeenCalled();
  });
});
