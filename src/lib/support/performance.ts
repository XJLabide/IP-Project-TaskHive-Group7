import type { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

/** Opt-in acquisition timing includes Prisma queueing and BEGIN latency, not
 * pure PgBouncer wait. Normal reads avoid the profiling transaction round trips.
 */
export async function adminRead<T>(section: string, read: (db: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  const started = performance.now();
  const diagnostic = process.env.ADMIN_QUERY_DIAGNOSTICS === "1";
  let acquisitionMs: number | null = null;
  let queryMs: number | null = null;
  let outcome = "error";
  try {
    const result = diagnostic ? await prisma.$transaction(async (tx) => {
      acquisitionMs = performance.now() - started;
      const queryStarted = performance.now();
      try { return await read(tx); }
      finally { queryMs = performance.now() - queryStarted; }
    }, { maxWait: 10_000, timeout: 10_000 }) : await read(prisma);
    outcome = "ok";
    return result;
  } finally {
    const durationMs = performance.now() - started;
    if (diagnostic || outcome === "error" || durationMs >= 1_000) {
      console.info("[admin-performance]", {
        operationId: randomUUID(), section, outcome,
        runtimeRegion: /^[a-z]{3}\d+$/.test(process.env.VERCEL_REGION ?? "") ? process.env.VERCEL_REGION : "unknown",
        durationMs: Math.round(durationMs * 100) / 100,
        acquisitionMs, queryMs,
      });
    }
  }
}
