import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Client } from "@upstash/qstash";

import {
  getScheduleStatus,
  scheduleConfigSnapshot,
  scheduledJobs,
  upsertSchedules,
} from "./schedules";

const destination = "https://taskhive.example/api/jobs";

function fakeClient(overrides: { list?: () => Promise<unknown>; create?: () => Promise<unknown> } = {}) {
  return {
    schedules: {
      list: overrides.list ?? vi.fn(async () => []),
      create: overrides.create ?? vi.fn(async () => ({ scheduleId: "sched_1" })),
    },
  } as unknown as Client;
}

describe("scheduled job registry", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("QSTASH_TOKEN", "token");
    vi.stubEnv("QSTASH_DESTINATION_URL", destination);
  });

  it("declares the four recurring jobs", () => {
    expect(scheduledJobs.map((job) => job.name)).toEqual([
      "assignments.expire_holds",
      "completions.send_reminders",
      "completions.auto_release",
      "reviews.publish_due",
    ]);
  });

  it("reports the signing configuration without leaking secrets", () => {
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "current");
    vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", "next");

    expect(scheduleConfigSnapshot()).toEqual({
      tokenSet: true,
      destinationUrl: destination,
      signingConfigured: true,
    });
  });
});

describe("upsertSchedules", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("QSTASH_TOKEN", "token");
    vi.stubEnv("QSTASH_DESTINATION_URL", destination);
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "current");
    vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", "next");
  });

  it("fails explicitly when QStash is not configured", async () => {
    vi.stubEnv("QSTASH_TOKEN", "");

    const result = await upsertSchedules({ client: fakeClient() });

    expect(result).toEqual({
      ok: false,
      reason: "QStash is not configured in this environment.",
    });
  });

  it("refuses to provision when signing keys are missing", async () => {
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "");

    const result = await upsertSchedules({ client: fakeClient() });

    expect(result).toEqual({
      ok: false,
      reason: expect.stringContaining("signing keys"),
    });
  });

  it("refuses production provisioning until signed delivery is verified", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("QSTASH_DELIVERY_VERIFIED", "");
    const create = vi.fn();
    const list = vi.fn(async () => []);
    expect(await upsertSchedules({ client: fakeClient({ list, create }) })).toMatchObject({ ok: false });
    expect(list).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("refuses a destination override that does not match the configured signed receiver", async () => {
    const list = vi.fn(async () => []);
    expect(await upsertSchedules({ client: fakeClient({ list }), destination: "https://other.example/api/jobs" }))
      .toMatchObject({ ok: false });
    expect(list).not.toHaveBeenCalled();
  });

  it("creates missing schedules and skips ones that already match", async () => {
    const create = vi.fn(async () => ({ scheduleId: "sched_new" }));
    const list = vi.fn(async () => [
      {
        scheduleId: "sched_existing",
        cron: "*/5 * * * *",
        destination,
        body: JSON.stringify({ jobName: "assignments.expire_holds" }),
        isPaused: false,
      },
    ]);

    const result = await upsertSchedules({ client: fakeClient({ list, create }) });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.created).toEqual([
      "completions.send_reminders",
      "completions.auto_release",
      "reviews.publish_due",
    ]);
    expect(result.skipped).toEqual(["assignments.expire_holds"]);
    expect(result.drifted).toEqual([]);
    expect(result.failures).toEqual([]);

    expect(create).toHaveBeenCalledTimes(3);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        destination,
        cron: "*/15 * * * *",
        retries: 3,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobName: "completions.auto_release" }),
      }),
    );
  });

  it("reports cron drift instead of silently replacing a schedule", async () => {
    const list = vi.fn(async () => [
      {
        scheduleId: "sched_stale",
        cron: "0 0 1 * *",
        destination,
        body: JSON.stringify({ jobName: "reviews.publish_due" }),
        isPaused: false,
      },
    ]);

    const result = await upsertSchedules({ client: fakeClient({ list }) });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.drifted).toEqual([
      {
        name: "reviews.publish_due",
        scheduleId: "sched_stale",
        expectedCron: "0 0 * * *",
        actualCron: "0 0 1 * *",
      },
    ]);
    expect(result.created).not.toContain("reviews.publish_due");
  });

  it("collects individual creation failures and keeps going", async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce(new Error("upstream rate limited"))
      .mockResolvedValue({ scheduleId: "sched_ok" });
    const list = vi.fn(async () => []);

    const result = await upsertSchedules({ client: fakeClient({ list, create }) });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.created.length).toBe(3);
    expect(result.failures).toEqual([
      { name: "assignments.expire_holds", reason: "upstream rate limited" },
    ]);
  });

  it("fails explicitly when the schedule list cannot be read", async () => {
    const list = vi.fn(async () => {
      throw new Error("unauthorized");
    });

    const result = await upsertSchedules({ client: fakeClient({ list }) });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain("unauthorized");
  });

  it("recognizes a base64-encoded job body", async () => {
    const list = vi.fn(async () => [
      {
        scheduleId: "sched_b64",
        cron: "0 * * * *",
        destination,
        body: undefined,
        bodyBase64: Buffer.from(
          JSON.stringify({ jobName: "completions.send_reminders" }),
        ).toString("base64"),
        isPaused: false,
      },
    ]);

    const result = await upsertSchedules({ client: fakeClient({ list }) });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.skipped).toContain("completions.send_reminders");
  });
});

describe("getScheduleStatus", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("QSTASH_TOKEN", "token");
    vi.stubEnv("QSTASH_DESTINATION_URL", destination);
  });

  it("reports every declared job as unprovisioned when not configured", async () => {
    vi.stubEnv("QSTASH_TOKEN", "");

    const status = await getScheduleStatus({ client: fakeClient() });

    expect(status.configured).toBe(false);
    expect(status.jobs).toHaveLength(4);
    expect(status.jobs.every((job) => job.scheduleId === null)).toBe(true);
  });

  it("surfaces last success, failure, and next run from QStash", async () => {
    const list = vi.fn(async () => [
      {
        scheduleId: "sched_hold",
        cron: "*/5 * * * *",
        destination,
        body: JSON.stringify({ jobName: "assignments.expire_holds" }),
        isPaused: false,
        lastScheduleTime: 1700000000000,
        nextScheduleTime: 1700000300000,
        lastScheduleStates: { msg_1: "SUCCESS", msg_2: "FAIL" },
      },
    ]);

    const status = await getScheduleStatus({ client: fakeClient({ list }) });

    expect(status.configured).toBe(true);
    expect(status.signingConfigured).toBe(false);
    expect(status.listError).toBeNull();

    const hold = status.jobs.find((job) => job.name === "assignments.expire_holds");
    expect(hold).toMatchObject({
      scheduleId: "sched_hold",
      actualCron: "*/5 * * * *",
      isPaused: false,
      lastScheduleTime: 1700000000000,
      nextScheduleTime: 1700000300000,
      lastScheduleStates: { msg_1: "SUCCESS", msg_2: "FAIL" },
    });

    const missing = status.jobs.find((job) => job.name === "reviews.publish_due");
    expect(missing?.scheduleId).toBeNull();
  });

  it("distinguishes a failed schedule read from an empty schedule set", async () => {
    const list = vi.fn(async () => {
      throw new Error("bad token");
    });

    const status = await getScheduleStatus({ client: fakeClient({ list }) });

    expect(status.configured).toBe(true);
    expect(status.listError).toBe("bad token");
    expect(status.jobs.every((job) => job.scheduleId === null)).toBe(true);
  });
});
