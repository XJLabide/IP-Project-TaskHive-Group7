import type { Client, Schedule } from "@upstash/qstash";
import { qstash } from "./qstash";
import { jobsReadiness } from "@/lib/providers/readiness.mjs";

export type ScheduleState = "IN_PROGRESS" | "SUCCESS" | "FAIL";

/**
 * The recurring marketplace jobs driven through `POST /api/jobs`. Cadence is a
 * trade-off between promptness and QStash request volume; each handler is
 * idempotent or advances a bounded cursor, so overlapping runs are safe.
 */
export type ScheduledJob = {
  name: string;
  cron: string;
  retries: number;
  description: string;
};

export const scheduledJobs: readonly ScheduledJob[] = [
  {
    name: "assignments.expire_holds",
    cron: "*/5 * * * *",
    retries: 3,
    description: "Reopen tasks whose 24-hour payment hold expired unpaid.",
  },
  {
    name: "completions.send_reminders",
    cron: "0 * * * *",
    retries: 3,
    description: "Send the single 24-hour Poster confirmation reminder.",
  },
  {
    name: "completions.auto_release",
    cron: "*/15 * * * *",
    retries: 3,
    description: "Release undisputed payouts 48 hours after completion.",
  },
  {
    name: "reviews.publish_due",
    cron: "0 0 * * *",
    retries: 3,
    description: "Publish reviews whose 14-day blind window elapsed.",
  },
];

/** QStash token plus a destination are required before any schedule is read or created. */
export function schedulesAreConfigured(): boolean {
  return Boolean(process.env.QSTASH_TOKEN && process.env.QSTASH_DESTINATION_URL);
}

/** The job route rejects every delivery unless both rotating signing keys are set. */
export function signingConfigured(): boolean {
  return Boolean(
    process.env.QSTASH_CURRENT_SIGNING_KEY &&
      process.env.QSTASH_NEXT_SIGNING_KEY,
  );
}

/** Signed scheduled delivery needs a token, a destination, and signing keys. */
export function scheduleConfigSnapshot(): {
  tokenSet: boolean;
  destinationUrl: string | null;
  signingConfigured: boolean;
} {
  return {
    tokenSet: Boolean(process.env.QSTASH_TOKEN),
    destinationUrl: process.env.QSTASH_DESTINATION_URL ?? null,
    signingConfigured: signingConfigured(),
  };
}

function parseJobBody(schedule: Schedule): string | null {
  if (schedule.body) {
    try {
      const parsed = JSON.parse(schedule.body) as { jobName?: unknown };
      if (typeof parsed.jobName === "string") return parsed.jobName;
    } catch {
      // Not a JSON body; fall through to the base64 body below.
    }
  }

  if (schedule.bodyBase64) {
    try {
      const decoded = Buffer.from(schedule.bodyBase64, "base64").toString("utf8");
      const parsed = JSON.parse(decoded) as { jobName?: unknown };
      if (typeof parsed.jobName === "string") return parsed.jobName;
    } catch {
      // Ignore malformed bodies from other schedules on the same destination.
    }
  }

  return null;
}

/** Indexes schedules on the jobs destination by the `jobName` in their body. */
function scheduleMapByJobName(
  schedules: Schedule[],
  destination: string | undefined,
): Map<string, Schedule> {
  const byJobName = new Map<string, Schedule>();
  for (const schedule of schedules) {
    if (schedule.destination !== destination) continue;
    const jobName = parseJobBody(schedule);
    if (jobName) byJobName.set(jobName, schedule);
  }
  return byJobName;
}

export type DriftedSchedule = {
  name: string;
  scheduleId: string;
  expectedCron: string;
  actualCron: string;
};

export type ScheduleFailure = {
  name: string;
  reason: string;
};

export type ProvisionResult =
  | {
      ok: true;
      created: string[];
      skipped: string[];
      drifted: DriftedSchedule[];
      failures: ScheduleFailure[];
    }
  | { ok: false; reason: string };

/**
 * Reconciles QStash schedules with the declared job set. QStash has no
 * schedule-level idempotency key, so the run lists existing schedules on the
 * destination and matches by the `jobName` in each body. Missing schedules are
 * created; an existing schedule whose cron differs is reported as drift instead
 * of being silently replaced, because QStash exposes no update operation.
 *
 * Refuses to provision when signing keys are missing: schedules would be
 * created but the job route would reject every delivery.
 */
export async function upsertSchedules(input: {
  client?: Client;
  destination?: string;
} = {}): Promise<ProvisionResult> {
  const destination = input.destination ?? process.env.QSTASH_DESTINATION_URL;

  if (!process.env.QSTASH_TOKEN || !destination) {
    return { ok: false, reason: "QStash is not configured in this environment." };
  }

  if (!signingConfigured()) {
    return {
      ok: false,
      reason:
        "QStash signing keys are not configured; schedules would be created but every delivery would be rejected.",
    };
  }

  if (destination !== process.env.QSTASH_DESTINATION_URL) {
    return { ok: false, reason: "Schedule destination must match the configured QSTASH_DESTINATION_URL receiver." };
  }
  const readiness = jobsReadiness();
  if (!readiness.ready) {
    return { ok: false, reason: `Background jobs are unavailable: ${readiness.issues.join("; ")}.` };
  }

  const client = input.client ?? qstash;

  let existing: Schedule[];
  try {
    existing = await client.schedules.list();
  } catch (error) {
    return {
      ok: false,
      reason: `QStash schedules could not be listed: ${error instanceof Error ? error.message : "unknown error"}`,
    };
  }

  const byJobName = scheduleMapByJobName(existing, destination);

  const created: string[] = [];
  const skipped: string[] = [];
  const drifted: DriftedSchedule[] = [];
  const failures: ScheduleFailure[] = [];

  for (const job of scheduledJobs) {
    const current = byJobName.get(job.name);

    if (current) {
      if (current.cron === job.cron) {
        skipped.push(job.name);
      } else {
        drifted.push({
          name: job.name,
          scheduleId: current.scheduleId,
          expectedCron: job.cron,
          actualCron: current.cron,
        });
      }
      continue;
    }

    try {
      await client.schedules.create({
        destination,
        cron: job.cron,
        retries: job.retries,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobName: job.name }),
      });
      created.push(job.name);
    } catch (error) {
      failures.push({
        name: job.name,
        reason: error instanceof Error ? error.message : "unknown error",
      });
    }
  }

  return { ok: true, created, skipped, drifted, failures };
}

export type ScheduleStatusEntry = {
  name: string;
  description: string;
  expectedCron: string;
  scheduleId: string | null;
  actualCron: string | null;
  isPaused: boolean | null;
  lastScheduleTime: number | null;
  nextScheduleTime: number | null;
  lastScheduleStates: Record<string, ScheduleState> | null;
};

export type ScheduleStatus = {
  configured: boolean;
  signingConfigured: boolean;
  /** Set when the schedule list could not be read, so "not provisioned" and "unknown" never look the same. */
  listError: string | null;
  jobs: ScheduleStatusEntry[];
};

function unprovisionedEntry(job: ScheduledJob): ScheduleStatusEntry {
  return {
    name: job.name,
    description: job.description,
    expectedCron: job.cron,
    scheduleId: null,
    actualCron: null,
    isPaused: null,
    lastScheduleTime: null,
    nextScheduleTime: null,
    lastScheduleStates: null,
  };
}

/**
 * Reports the observed state of every declared schedule so operators can check
 * last success, last failure, and the next expected run without the dashboard.
 */
export async function getScheduleStatus(input: {
  client?: Client;
  destination?: string;
} = {}): Promise<ScheduleStatus> {
  const snapshot = scheduleConfigSnapshot();

  if (!schedulesAreConfigured()) {
    return {
      configured: false,
      signingConfigured: snapshot.signingConfigured,
      listError: null,
      jobs: scheduledJobs.map(unprovisionedEntry),
    };
  }

  const client = input.client ?? qstash;
  const destination = input.destination ?? process.env.QSTASH_DESTINATION_URL;

  let schedules: Schedule[] = [];
  let listError: string | null = null;
  try {
    schedules = await client.schedules.list();
  } catch (error) {
    listError =
      error instanceof Error ? error.message : "schedule list unavailable";
  }

  const byJobName = scheduleMapByJobName(schedules, destination);

  const jobs = scheduledJobs.map((job): ScheduleStatusEntry => {
    const current = byJobName.get(job.name);
    if (!current) return unprovisionedEntry(job);

    return {
      name: job.name,
      description: job.description,
      expectedCron: job.cron,
      scheduleId: current.scheduleId,
      actualCron: current.cron,
      isPaused: current.isPaused,
      lastScheduleTime: current.lastScheduleTime ?? null,
      nextScheduleTime: current.nextScheduleTime ?? null,
      lastScheduleStates: current.lastScheduleStates ?? null,
    };
  });

  return {
    configured: true,
    signingConfigured: snapshot.signingConfigured,
    listError,
    jobs,
  };
}
