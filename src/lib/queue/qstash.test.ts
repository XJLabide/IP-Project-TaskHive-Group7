import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { publish } = vi.hoisted(() => ({ publish: vi.fn() }));
vi.mock("@upstash/qstash", () => ({
  Client: class { publishJSON = publish; },
}));

import { publishJob } from "./qstash";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("QSTASH_TOKEN", "test-token");
  vi.stubEnv("QSTASH_DESTINATION_URL", "https://taskhive.example/api/jobs");
  vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "");
  vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", "");
});
afterEach(() => vi.unstubAllEnvs());

it("does not publish jobs when the receiver cannot verify signatures", async () => {
  expect(await publishJob("reviews.publish_due", {})).toMatchObject({ queued: false });
  expect(publish).not.toHaveBeenCalled();
});

it.each([
  "http://taskhive.example/api/jobs",
  "https://taskhive.example/other",
  "https://secret:credential@taskhive.example/api/jobs",
  "https://taskhive.example/api/jobs?token=secret",
  "https://taskhive.example/api/jobs#fragment",
  "not-a-url",
])("refuses an unsafe or incorrect QStash destination (%s)", async (destination) => {
  vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "test-current");
  vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", "test-next");
  vi.stubEnv("QSTASH_DESTINATION_URL", destination);
  expect(await publishJob("reviews.publish_due", {})).toMatchObject({ queued: false });
  expect(publish).not.toHaveBeenCalled();
});

it("keeps production publishing disabled until signed delivery was verified", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "test-current");
  vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", "test-next");
  vi.stubEnv("QSTASH_DELIVERY_VERIFIED", "");
  expect(await publishJob("reviews.publish_due", {})).toMatchObject({ queued: false });
  expect(publish).not.toHaveBeenCalled();
});

it.each(["QSTASH_TOKEN", "QSTASH_DESTINATION_URL", "QSTASH_CURRENT_SIGNING_KEY", "QSTASH_NEXT_SIGNING_KEY"])("refuses missing or blank %s", async (name) => {
  vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "test-current");
  vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", "test-next");
  vi.stubEnv(name, "   ");
  expect(await publishJob("reviews.publish_due", {})).toMatchObject({ queued: false });
  expect(publish).not.toHaveBeenCalled();
});

it("publishes to the verified production destination with retry and deduplication options", async () => {
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "test-current");
  vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", "test-next");
  vi.stubEnv("QSTASH_DELIVERY_VERIFIED", "true");
  expect(await publishJob("notifications.deliver_email", { notificationId: "notification_1" }, { deduplicationId: "notification_1", retries: 4 }))
    .toEqual({ queued: true, jobName: "notifications.deliver_email" });
  expect(publish).toHaveBeenCalledWith({
    url: "https://taskhive.example/api/jobs",
    body: { jobName: "notifications.deliver_email", notificationId: "notification_1" },
    deduplicationId: "notification_1", retries: 4,
  });
});
