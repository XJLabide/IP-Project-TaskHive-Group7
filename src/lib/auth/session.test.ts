import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { verify, read, update, setup } = vi.hoisted(() => ({ verify: vi.fn(), read: vi.fn(), update: vi.fn(), setup: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./firebase-admin", () => ({ getFirebaseAdminAuth: setup }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: read, update } } }));
import { getAuthContext } from "./session";

const requestId = "11111111-1111-4111-8111-111111111111";
const headers = () => new Headers({ cookie: "taskhive_session=private-session-cookie", "x-taskhive-request-id": requestId });
let log: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "production");
  log = vi.spyOn(console, "warn").mockImplementation(() => {});
  setup.mockReturnValue({ verifySessionCookie: verify });
  verify.mockResolvedValue({ uid: "private-uid", email: "private@example.invalid", email_verified: true });
  read.mockResolvedValue({ id: "private-user-id", name: "Private Name", email: "private@example.invalid", emailVerified: true, image: null, isAdmin: false, ageAttestedAt: new Date(0), taskerVerification: null });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

it("fails closed and records a redacted database failure with request correlation and timing", async () => {
  read.mockRejectedValue(Object.assign(new Error("postgresql://private-password@database private@example.invalid"), { code: "P1001" }));
  expect(await getAuthContext(headers())).toBeNull();
  expect(log).toHaveBeenCalledWith("[auth-diagnostics]", expect.objectContaining({
    requestId, operation: "resolve_session", outcome: "denied", category: "database_unavailable", stage: "database_read_user",
    timingsMs: expect.objectContaining({ firebase_verify_session: expect.any(Number), database_read_user: expect.any(Number) }),
  }));
  expect(JSON.stringify(log.mock.calls)).not.toMatch(/private-session-cookie|private-password|private@example|private-uid|private-user-id|Private Name/);
  expect(verify).toHaveBeenCalledWith("private-session-cookie", true);
});

it.each([
  ["auth/session-cookie-expired", "session_expired"],
  ["auth/session-cookie-revoked", "session_revoked"],
  ["auth/invalid-session-cookie", "session_invalid"],
  ["auth/user-disabled", "account_disabled"],
  ["app/invalid-credential", "firebase_configuration"],
  ["app/network-error", "firebase_unavailable"],
  ["unknown/private-token", "firebase_failure"],
])("classifies Firebase %s without logging provider details", async (code, category) => {
  verify.mockRejectedValue(Object.assign(new Error("private-session-cookie private@example.invalid private-key"), { code }));
  expect(await getAuthContext(headers())).toBeNull();
  expect(read).not.toHaveBeenCalled();
  expect(log).toHaveBeenCalledWith("[auth-diagnostics]", expect.objectContaining({ category, stage: "firebase_verify_session", outcome: "denied" }));
  expect(JSON.stringify(log.mock.calls)).not.toMatch(/private-key|private@example|private-session|unknown\/private-token/);
});

it("distinguishes Firebase setup errors before verification", async () => {
  setup.mockImplementation(() => { throw new Error("service-account private-key"); });
  expect(await getAuthContext(headers())).toBeNull();
  expect(verify).not.toHaveBeenCalled();
  expect(log).toHaveBeenCalledWith("[auth-diagnostics]", expect.objectContaining({ category: "firebase_configuration", stage: "firebase_setup" }));
  expect(JSON.stringify(log.mock.calls)).not.toContain("private-key");
});

it("records sync failures separately and does not return a stale authenticated user", async () => {
  read.mockResolvedValue({ id: "private-user-id", email: "old@example.invalid", emailVerified: false });
  update.mockRejectedValue(Object.assign(new Error("private-email-sync"), { code: "P2024" }));
  expect(await getAuthContext(headers())).toBeNull();
  expect(log).toHaveBeenCalledWith("[auth-diagnostics]", expect.objectContaining({ category: "database_unavailable", stage: "database_sync_email" }));
});

it("recognizes initialization errorCode without exposing connection settings", async () => {
  read.mockRejectedValue({ errorCode: "P1000", message: "private-password" });
  expect(await getAuthContext(headers())).toBeNull();
  expect(log).toHaveBeenCalledWith("[auth-diagnostics]", expect.objectContaining({ category: "database_configuration" }));
});

it("keeps development fallback visible and confined to non-production", async () => {
  vi.stubEnv("NODE_ENV", "development");
  read.mockRejectedValue(Object.assign(new Error("private-password"), { code: "P1001" }));
  expect((await getAuthContext(headers()))?.session.user.isAdmin).toBe(false);
  expect(log).toHaveBeenCalledWith("[auth-diagnostics]", expect.objectContaining({ outcome: "development_fallback", category: "database_unavailable" }));
});

it("logs malformed cookies without reaching dependencies and skips normal guests", async () => {
  expect(await getAuthContext(new Headers())).toBeNull();
  expect(log).not.toHaveBeenCalled();
  expect(await getAuthContext(new Headers({ cookie: "taskhive_session=%E0%A4%A" }))).toBeNull();
  expect(setup).not.toHaveBeenCalled();
  expect(log).toHaveBeenCalledWith("[auth-diagnostics]", expect.objectContaining({ category: "malformed_cookie" }));
});

it("keeps successful diagnostics opt-in and redacted", async () => {
  const info = vi.spyOn(console, "info").mockImplementation(() => {});
  expect((await getAuthContext(headers()))?.session.user.id).toBe("private-user-id");
  expect(info).not.toHaveBeenCalled(); expect(log).not.toHaveBeenCalled();
  vi.stubEnv("AUTH_DIAGNOSTICS", "1");
  expect((await getAuthContext(headers()))?.actor.signedIn).toBe(true);
  expect(info).toHaveBeenCalledWith("[auth-diagnostics]", expect.objectContaining({ requestId, outcome: "authenticated", category: "authenticated", durationMs: expect.any(Number) }));
  expect(JSON.stringify(info.mock.calls)).not.toMatch(/private-uid|private@example|private-user-id|private-session-cookie|Private Name/);
});

it("fails closed even when logging itself throws", async () => {
  read.mockRejectedValue(new Error("private-failure"));
  log.mockImplementation(() => { throw new Error("logging unavailable"); });
  expect(await getAuthContext(headers())).toBeNull();
});
