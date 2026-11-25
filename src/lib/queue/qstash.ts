import { Client } from "@upstash/qstash";
import { jobsReadiness } from "@/lib/providers/readiness.mjs";

export const qstash = new Client({
  token: process.env.QSTASH_TOKEN ?? "development-placeholder-token",
});

export type PublishJobOptions = {
  deduplicationId?: string;
  retries?: number;
};

export type PublishJobResult =
  | { queued: true; jobName: string }
  | { queued: false; jobName: string; reason: string };

export async function publishJob(
  jobName: string,
  body: Record<string, unknown>,
  options: PublishJobOptions = {},
): Promise<PublishJobResult> {
  const readiness = jobsReadiness();
  const destination = process.env.QSTASH_DESTINATION_URL;
  if (!readiness.ready || !destination) {
    return {
      queued: false,
      jobName,
      reason: `Background jobs are unavailable: ${readiness.issues.join("; ")}.`,
    };
  }

  await qstash.publishJSON({
    url: destination,
    body: {
      jobName,
      ...body,
    },
    ...options,
  });
  return { queued: true, jobName };
}
