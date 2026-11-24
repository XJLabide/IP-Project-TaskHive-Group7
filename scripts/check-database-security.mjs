import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

// Require an explicit target: do not silently load a production URL from .env.
if (!process.env.DATABASE_URL) {
  console.error("Database security check requires an explicit DATABASE_URL.");
  process.exitCode = 1;
} else {
  const client = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
  try {
    const sql = await readFile(new URL("../prisma/security/check-public-tables.sql", import.meta.url), "utf8");
    const findings = await client.$queryRawUnsafe(sql);
    if (findings.length > 0) {
      for (const finding of findings) console.error(`${finding.issue}: ${finding.objectName}`);
      process.exitCode = 1;
    } else {
      console.log("Database security check passed: public tables have RLS and no public/API grants.");
    }
  } catch {
    // Prisma error messages can contain connection details. Never print the URL
    // or raw provider errors from a deployment check.
    console.error("Database security check could not complete. Check connectivity and catalog permissions.");
    process.exitCode = 1;
  } finally {
    await client.$disconnect();
  }
}
