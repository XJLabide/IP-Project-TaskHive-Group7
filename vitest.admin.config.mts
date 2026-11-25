import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const url = process.env.ADMIN_TEST_DATABASE_URL;
if (!url) throw new Error("ADMIN_TEST_DATABASE_URL must target a disposable, fully migrated PostgreSQL database.");
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["src/lib/support/reads.integration.ts"], env: { DATABASE_URL: url, VERCEL: "0" }, testTimeout: 20_000, hookTimeout: 30_000 },
});
