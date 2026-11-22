import { readFileSync } from "node:fs";
import { PrismaClient, type Prisma } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.SECURITY_TEST_DATABASE_URL;
if (!url) throw new Error("SECURITY_TEST_DATABASE_URL must target a disposable, fully migrated PostgreSQL database with the test API roles.");
const client = new PrismaClient({ datasourceUrl: url });
const sql = readFileSync(new URL("../../../prisma/security/check-public-tables.sql", import.meta.url), "utf8");
type Finding = { objectName: string; issue: string };
const check = (db: Pick<Prisma.TransactionClient, "$queryRawUnsafe"> = client) => db.$queryRawUnsafe<Finding[]>(sql);

// Every fixture change, including grants and roles, is rolled back. An explicit
// test-only database is still mandatory; never run integration tests on production.
const rollback = new Error("Rollback security fixture");
async function withFixture(run: (tx: Prisma.TransactionClient) => Promise<void>) {
  try {
    await client.$transaction(async (tx) => {
      await run(tx);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}
beforeAll(async () => {
  const roles = await client.$queryRaw<{ rolname: string }[]>`SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') ORDER BY rolname`;
  expect(roles.map((role) => role.rolname)).toEqual(["anon", "authenticated"]);
});
afterAll(() => client.$disconnect());

describe("migrated PostgreSQL public-table security", () => {
  it("replays the tracked migrations into a database with no RLS or API-grant findings", async () => {
    expect(await check()).toEqual([]);
  });

  it("detects a newly created table even when default grants were revoked", async () => {
    await withFixture(async (tx) => {
      await tx.$executeRawUnsafe('CREATE TABLE public.security_probe (id integer)');
      expect(await check(tx)).toEqual([{ objectName: "public.security_probe", issue: "RLS_DISABLED" }]);
    });
  });

  it("detects a new table exposed to an API role", async () => {
    await withFixture(async (tx) => {
      await tx.$executeRawUnsafe('CREATE TABLE public.security_probe (id integer)');
      await tx.$executeRawUnsafe('GRANT SELECT ON public.security_probe TO anon');
      expect(await check(tx)).toEqual([
        { objectName: "public.security_probe", issue: "API_PRIVILEGE:anon" },
        { objectName: "public.security_probe", issue: "RLS_DISABLED" },
      ]);
    });
  });

  it("rejects API grants even when RLS is enabled", async () => {
    await withFixture(async (tx) => {
      await tx.$executeRawUnsafe('GRANT TRUNCATE ON public."PaymentAttempt" TO authenticated');
      expect(await check(tx)).toContainEqual({ objectName: 'public."PaymentAttempt"', issue: "API_PRIVILEGE:authenticated" });
    });
  });

  it("detects PUBLIC grants as well as API access inherited through PUBLIC", async () => {
    await withFixture(async (tx) => {
      await tx.$executeRawUnsafe('GRANT SELECT ON public."PaymentAttempt" TO PUBLIC');
      expect(await check(tx)).toEqual([
        { objectName: 'public."PaymentAttempt"', issue: "API_PRIVILEGE:anon" },
        { objectName: 'public."PaymentAttempt"', issue: "API_PRIVILEGE:authenticated" },
        { objectName: 'public."PaymentAttempt"', issue: "PUBLIC_PRIVILEGE" },
      ]);
    });
  });

  it("detects column-only grants that table-level revocation does not remove", async () => {
    await withFixture(async (tx) => {
      await tx.$executeRawUnsafe('GRANT SELECT (id) ON public."PaymentAttempt" TO authenticated');
      await tx.$executeRawUnsafe('GRANT UPDATE (provider) ON public."PaymentAttempt" TO PUBLIC');
      const findings = await check(tx);
      expect(findings).toContainEqual({ objectName: 'public."PaymentAttempt"', issue: "API_PRIVILEGE:authenticated" });
      expect(findings).toContainEqual({ objectName: 'public."PaymentAttempt"', issue: "PUBLIC_PRIVILEGE" });
    });
  });

  it("detects effective privileges inherited from another role", async () => {
    await withFixture(async (tx) => {
      await tx.$executeRawUnsafe('CREATE ROLE security_probe_reader NOLOGIN');
      await tx.$executeRawUnsafe('GRANT SELECT ON public."PaymentAttempt" TO security_probe_reader');
      await tx.$executeRawUnsafe('GRANT security_probe_reader TO authenticated');
      expect(await check(tx)).toContainEqual({ objectName: 'public."PaymentAttempt"', issue: "API_PRIVILEGE:authenticated" });
    });
  });

  it("detects grants on views that can otherwise bypass base-table RLS", async () => {
    await withFixture(async (tx) => {
      await tx.$executeRawUnsafe('CREATE VIEW public.security_probe_view AS SELECT id FROM public."PaymentAttempt"');
      await tx.$executeRawUnsafe('GRANT SELECT ON public.security_probe_view TO anon');
      expect(await check(tx)).toEqual([{ objectName: "public.security_probe_view", issue: "API_PRIVILEGE:anon" }]);
    });
  });

  it("requires migrated history in the public schema", async () => {
    await withFixture(async (tx) => {
      await tx.$executeRawUnsafe('ALTER TABLE public._prisma_migrations RENAME TO security_probe_history');
      expect(await check(tx)).toContainEqual({ objectName: "public._prisma_migrations", issue: "MIGRATION_HISTORY_MISSING" });
    });
  });

  it.each(["anon", "authenticated"])("denies actual SQL reads to %s after migrations", async (role) => {
    await withFixture(async (tx) => {
      // Role is one of the two fixed test cases, never external input.
      await tx.$executeRawUnsafe(`SET LOCAL ROLE ${role}`);
      await expect(tx.$queryRawUnsafe('SELECT id FROM public."PaymentAttempt"')).rejects.toMatchObject({
        code: "P2010", meta: { code: "42501" },
      });
    });
  });

  it("keeps owner access while RLS denies API rows if a grant is accidentally reintroduced", async () => {
    await withFixture(async (tx) => {
      await tx.$executeRawUnsafe('CREATE TABLE public.security_probe (id integer)');
      await tx.$executeRawUnsafe('INSERT INTO public.security_probe VALUES (1)');
      await tx.$executeRawUnsafe('ALTER TABLE public.security_probe ENABLE ROW LEVEL SECURITY');
      await tx.$executeRawUnsafe('GRANT SELECT ON public.security_probe TO anon');
      expect(await tx.$queryRawUnsafe('SELECT id FROM public.security_probe')).toEqual([{ id: 1 }]);
      await tx.$executeRawUnsafe('SET LOCAL ROLE anon');
      expect(await tx.$queryRawUnsafe('SELECT id FROM public.security_probe')).toEqual([]);
    });
  });

});
