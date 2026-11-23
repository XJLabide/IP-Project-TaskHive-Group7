import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

type Render = {
  counts: { verify: number; reads: number; updates: number };
  elapsedMs: number;
  actors: { id: string; isAdmin: boolean; ageAttested: boolean; verification: string; appealCount: number }[];
  errors: string[];
  sessions: { user: Record<string, unknown> }[];
};
const result = JSON.parse(execFileSync(process.execPath, ["--conditions=react-server", "tests/auth/request-resolution.mjs"], {
  cwd: process.cwd(), env: { ...process.env, NODE_ENV: "production" }, encoding: "utf8", timeout: 20_000,
})) as Record<string, Render> & { concurrent: Render[]; verificationChecks: boolean[]; uncached: { counts: Render["counts"]; signedIn: boolean; afterRevocation: null; afterMutation: { name: string } } };

describe("request-scoped auth in the real React Server Component renderer", () => {
  it("shares verification and one user read across root/profile layouts, page, and guard", () => {
    expect(result.first.errors).toEqual([]);
    expect(result.first.counts).toEqual({ verify: 1, reads: 1, updates: 0 });
    expect(result.first.actors).toHaveLength(2);
  });

  it("shares session-only and actor consumers in the same render", () => {
    expect(result.mixed.counts).toEqual({ verify: 1, reads: 1, updates: 0 });
  });

  it("rechecks the same cookie on a new render and isolates overlapping users", () => {
    expect(result.second.counts).toEqual({ verify: 1, reads: 1, updates: 0 });
    expect(result.concurrent.map((render) => render.actors[0].id)).toEqual(["user_1", "user_2"]);
    for (const render of result.concurrent) expect(render.counts).toEqual({ verify: 1, reads: 1, updates: 0 });
  });

  it("refreshes authorization fields on the next request", () => {
    expect(result.changed.actors[0]).toMatchObject({ isAdmin: true, ageAttested: false, verification: "rejected", appealCount: 1 });
    expect(result.demoted.actors[0].isAdmin).toBe(false);
    expect(result.verificationChecks.length).toBeGreaterThan(0);
    expect(result.verificationChecks.every(Boolean)).toBe(true);
  });

  it("synchronizes Firebase email state once and keeps internal actor fields out of the session DTO", () => {
    expect(result.synchronized.counts).toEqual({ verify: 1, reads: 1, updates: 1 });
    expect(result.synchronized.sessions[0].user).toMatchObject({ email: "member@example.test", emailVerified: true });
    expect(Object.keys(result.synchronized.sessions[0].user).sort()).toEqual(["email", "emailVerified", "id", "image", "isAdmin", "name"]);
  });

  it("reverifies outside React renders and preserves fresh post-mutation actor reads", () => {
    expect(result.uncached.signedIn).toBe(true);
    expect(result.uncached.afterRevocation).toBeNull();
    expect(result.uncached.afterMutation.name).toBe("Updated profile");
    expect(result.uncached.counts.verify).toBe(2);
  });

  it.each(["revokedRequest", "invalid", "guest", "unavailable", "missing", "syncFailed", "malformed"])("fails closed for %s", (key) => {
    expect(result[key].actors).toEqual([]);
    expect(result[key].errors).toContain("REDIRECT:/login");
    expect(result[key].counts.verify).toBe(["guest", "malformed"].includes(key) ? 0 : 1);
    expect(result[key].counts.reads).toBe(["unavailable", "missing", "syncFailed"].includes(key) ? 1 : 0);
  });
});
