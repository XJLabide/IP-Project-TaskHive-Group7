import { describe, expect, it } from "vitest";
import { runtimeDatabaseUrl } from "./database-url";

describe("runtimeDatabaseUrl", () => {
  it("uses transaction pooling for Supabase on Vercel", () => {
    const url = runtimeDatabaseUrl("postgresql://postgres.project:secret@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?schema=public", true);
    const parsed = new URL(url!);
    expect(parsed.port).toBe("6543");
    expect(parsed.searchParams.get("pgbouncer")).toBe("true");
    expect(parsed.searchParams.get("connection_limit")).toBe("2");
    expect(parsed.searchParams.get("schema")).toBe("public");
  });

  it("preserves explicitly configured pool limits", () => {
    const url = runtimeDatabaseUrl("postgresql://postgres.project:secret@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?connection_limit=1", true);
    expect(new URL(url!).searchParams.get("connection_limit")).toBe("1");
    expect(new URL(url!).searchParams.get("pgbouncer")).toBe("true");
  });

  it("leaves local and other databases unchanged", () => {
    const local = "postgresql://user:secret@localhost:55432/taskhive";
    const other = "postgresql://user:secret@db.example.com:5432/taskhive";
    expect(runtimeDatabaseUrl(local, false)).toBe(local);
    expect(runtimeDatabaseUrl(other, true)).toBe(other);
    expect(runtimeDatabaseUrl(undefined, true)).toBeUndefined();
  });
});
