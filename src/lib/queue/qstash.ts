import { Client } from "@upstash/qstash";

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
  if (!process.env.QSTASH_TOKEN || !process.env.QSTASH_DESTINATION_URL) {
    return {
      queued: false,
      jobName,
      reason: "QStash is not configured in this environment.",
    };
  }

  await qstash.publishJSON({
    url: process.env.QSTASH_DESTINATION_URL,
    body: {
      jobName,
      ...body,
    },
    ...options,
  });
  return { queued: true, jobName };
}
