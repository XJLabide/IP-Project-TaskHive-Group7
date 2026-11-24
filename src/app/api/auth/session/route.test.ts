import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { setup, verify, createCookie, upsert } = vi.hoisted(() => ({ setup: vi.fn(), verify: vi.fn(), createCookie: vi.fn(), upsert: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/firebase-admin", () => ({ getFirebaseAdminAuth: setup }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { upsert } } }));
// Cookie options are captured at module startup, just as in a production server.
vi.stubEnv("NODE_ENV", "production");
const { POST, DELETE } = await import("./route");

const requestId = "22222222-2222-4222-8222-222222222222";
const request = (body: unknown = { idToken: "private-id-token" }, origin = "https://taskhive.example") => new Request("https://taskhive.example/api/auth/session", {
  method: "POST", headers: { origin, "content-type": "application/json", "x-taskhive-request-id": requestId }, body: JSON.stringify(body),
});
let log: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://taskhive.example");
  log = vi.spyOn(console, "warn").mockImplementation(() => {});
  setup.mockReturnValue({ verifyIdToken: verify, createSessionCookie: createCookie });
  verify.mockResolvedValue({ uid: "private-uid", email: "private@example.invalid", email_verified: true });
  upsert.mockResolvedValue({ id: "private-user-id", email: "private@example.invalid", name: "Private Name", emailVerified: true });
  createCookie.mockResolvedValue("private-created-cookie");
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

it.each([
  ["verify", "auth/id-token-expired", 401, "session_expired", "firebase_verify_id_token"],
  ["upsert", "P2002", 409, "database_conflict", "database_upsert_user"],
  ["upsert", "P1001", 503, "database_unavailable", "database_upsert_user"],
  ["cookie", "auth/internal-error", 503, "firebase_unavailable", "firebase_create_session"],
] as const)("records %s failures while preserving HTTP %s/%s behavior", async (phase, code, status, category, stage) => {
  const mock = phase === "verify" ? verify : phase === "upsert" ? upsert : createCookie;
  mock.mockRejectedValue(Object.assign(new Error("private-id-token private-password private@example.invalid"), { code }));
  const response = await POST(request());
  expect(response.status).toBe(status);
  expect(response.headers.has("set-cookie")).toBe(false);
  expect(log).toHaveBeenCalledTimes(1);
  expect(log).toHaveBeenCalledWith("[auth-diagnostics]", expect.objectContaining({ requestId, operation: "create_session", outcome: "denied", category, stage, durationMs: expect.any(Number) }));
  expect(JSON.stringify(log.mock.calls) + await response.text()).not.toMatch(/private-id-token|private-password|private@example|private-uid|private-user-id|Private Name/);
  if (phase !== "cookie") expect(createCookie).not.toHaveBeenCalled();
});

it("classifies setup failures without exposing service-account details", async () => {
  setup.mockImplementation(() => { throw new Error("private-key credential-settings"); });
  expect((await POST(request())).status).toBe(503);
  expect(verify).not.toHaveBeenCalled();
  expect(log).toHaveBeenCalledWith("[auth-diagnostics]", expect.objectContaining({ category: "firebase_configuration", stage: "firebase_setup" }));
  expect(JSON.stringify(log.mock.calls)).not.toContain("private-key");
});

it("keeps successful exchange and cookie security unchanged with opt-in safe timings", async () => {
  vi.stubEnv("AUTH_DIAGNOSTICS", "1");
  const info = vi.spyOn(console, "info").mockImplementation(() => {});
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(verify).toHaveBeenCalledWith("private-id-token", true);
  expect(response.headers.get("set-cookie")).toMatch(/HttpOnly/);
  expect(response.headers.get("set-cookie")).toMatch(/Secure/);
  expect(response.headers.get("set-cookie")).toMatch(/SameSite=lax/i);
  expect(info).toHaveBeenCalledWith("[auth-diagnostics]", expect.objectContaining({ requestId, outcome: "authenticated", timingsMs: { firebase_setup: expect.any(Number), firebase_verify_id_token: expect.any(Number), database_upsert_user: expect.any(Number), firebase_create_session: expect.any(Number) } }));
  expect(JSON.stringify(info.mock.calls)).not.toMatch(/private-id-token|private-created-cookie|private@example|private-uid|private-user-id|Private Name/);
});

it("rejects bad origins and invalid request bodies before calling dependencies", async () => {
  expect((await POST(request(undefined, "https://untrusted.example"))).status).toBe(403);
  expect((await POST(request(null))).status).toBe(400);
  expect(setup).not.toHaveBeenCalled(); expect(log).not.toHaveBeenCalled();
});

it("records a missing identity email without creating an account or cookie", async () => {
  verify.mockResolvedValue({ uid: "private-uid" });
  expect((await POST(request())).status).toBe(400);
  expect(upsert).not.toHaveBeenCalled(); expect(createCookie).not.toHaveBeenCalled();
  expect(log).toHaveBeenCalledWith("[auth-diagnostics]", expect.objectContaining({ category: "identity_email_missing" }));
});

it("retains the origin-protected sign-out cookie clearing behavior", async () => {
  expect((await DELETE(request(undefined, "https://untrusted.example"))).status).toBe(403);
  const response = await DELETE(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("set-cookie")).toMatch(/Max-Age=0/);
  expect(setup).not.toHaveBeenCalled();
});
