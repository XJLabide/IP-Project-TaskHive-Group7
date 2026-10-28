import { createHash, createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { deliverEmailMock, completionMocks, paymentMocks } = vi.hoisted(() => ({
  deliverEmailMock: vi.fn(),
  completionMocks: {
    autoReleaseCompletions: vi.fn(),
    publishDueReviews: vi.fn(),
    sendCompletionReminders: vi.fn(),
  },
  paymentMocks: { expireAssignmentHolds: vi.fn() },
}));

vi.mock("@/lib/notifications/email", () => ({
  deliverNotificationEmail: deliverEmailMock,
}));
vi.mock("@/lib/completion/service", () => completionMocks);
vi.mock("@/lib/payments/service", () => paymentMocks);
vi.mock("@/lib/api/response", () => ({
  ok: (data: unknown) => Response.json({ data }),
  problem: (message: string, status: number) =>
    Response.json({ error: message }, { status }),
}));

import { POST } from "./route";

const currentSigningKey = "taskhive-test-current-signing-key";
const nextSigningKey = "taskhive-test-next-signing-key";
const url = "https://taskhive.example/api/jobs";

function signedRequest(body: string) {
  const now = Math.floor(Date.now() / 1000);
  const encodedHeader = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const encodedPayload = Buffer.from(
    JSON.stringify({
      iss: "Upstash",
      sub: url,
      exp: now + 300,
      nbf: now - 1,
      iat: now,
      jti: "test-message-id",
      body: createHash("sha256").update(body).digest("base64url"),
    }),
  ).toString("base64url");
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", currentSigningKey)
    .update(signingInput)
    .digest("base64url");

  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "Upstash-Signature": `${signingInput}.${signature}`,
    },
    body,
  });
}

describe("signed QStash job route", () => {
  beforeEach(() => {
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", currentSigningKey);
    vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", nextSigningKey);
    vi.stubEnv("QSTASH_DESTINATION_URL", url);
    vi.clearAllMocks();
    deliverEmailMock.mockResolvedValue({ status: "SENT" });
  });

  it("dispatches an authenticated email job", async () => {
    const response = await POST(
      signedRequest(JSON.stringify({
        jobName: "notifications.deliver_email",
        notificationId: "notification_1",
      })),
    );

    expect(response.status).toBe(200);
    expect(deliverEmailMock).toHaveBeenCalledWith("notification_1");
  });

  it("rejects an unsigned job without dispatching it", async () => {
    const response = await POST(
      new Request(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jobName: "notifications.deliver_email",
          notificationId: "notification_1",
        }),
      }),
    );

    expect(response.status).not.toBe(200);
    expect(deliverEmailMock).not.toHaveBeenCalled();
  });
});
