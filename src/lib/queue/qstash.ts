import { Client } from "@upstash/qstash";

export const qstash = new Client({
  token: process.env.QSTASH_TOKEN ?? "development-placeholder-token",
});

export async function publishJob(jobName: string, body: Record<string, unknown>) {
  if (!process.env.QSTASH_TOKEN || !process.env.QSTASH_DESTINATION_URL) {
    return {
      queued: false,
      jobName,
      reason: "QStash is not configured in this environment.",
    };
  }

  return qstash.publishJSON({
    url: process.env.QSTASH_DESTINATION_URL,
    body: {
      jobName,
      ...body,
    },
  });
}
