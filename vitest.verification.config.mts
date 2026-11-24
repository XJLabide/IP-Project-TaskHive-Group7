import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const databaseUrl = process.env.VERIFICATION_TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("VERIFICATION_TEST_DATABASE_URL must target a disposable, fully migrated PostgreSQL database.");
}

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/lib/verification/service.integration.ts"],
    env: { DATABASE_URL: databaseUrl, VERCEL: "0" },
  },
});
