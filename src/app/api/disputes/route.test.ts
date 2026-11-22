import { beforeEach, describe, expect, it, vi } from "vitest";
const { requireUserMock, disputeMock } = vi.hoisted(() => ({ requireUserMock: vi.fn(), disputeMock: vi.fn() }));
vi.mock("@/lib/api/response", () => ({
  requireUser: requireUserMock,
  created: (data: unknown) => Response.json({ data }, { status: 201 }),
  problem: (error: string, status = 400) => Response.json({ error }, { status }),
}));
vi.mock("@/lib/completion/service", () => ({ disputeCompletion: disputeMock }));
import { POST } from "./route";
const request = (body = JSON.stringify({ taskId: "task_1", reason: "Work was not completed" })) => new Request("https://example.test/api/disputes", { method: "POST", body });
beforeEach(() => {
  vi.clearAllMocks();
  requireUserMock.mockResolvedValue({ session: { user: { id: "poster_1" } }, response: null });
  disputeMock.mockResolvedValue({ ok: true, disputeId: "stored_dispute", taskId: "task_1" });
});
describe("dispute creation API", () => {
  it("returns a persisted dispute and uses the session identity", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect((await response.json()).data.disputeId).toBe("stored_dispute");
    expect(disputeMock).toHaveBeenCalledWith({ actorId: "poster_1", taskId: "task_1", reason: "Work was not completed" });
  });
  it.each(["{", "null", "[]", '{}', '{"taskId":"task_1","reason":"   "}', JSON.stringify({ taskId: "task_1", reason: "x".repeat(2001) })])("rejects invalid input %s", async (body) => {
    expect((await POST(request(body))).status).toBe(422);
    expect(disputeMock).not.toHaveBeenCalled();
  });
  it("rejects a guest before writing", async () => {
    requireUserMock.mockResolvedValue({ session: null, response: new Response(null, { status: 401 }) });
    expect((await POST(request())).status).toBe(401);
    expect(disputeMock).not.toHaveBeenCalled();
  });
  it.each([["not_participant", 403], ["not_found", 404], ["already_disputed", 409], ["already_released", 409]])("maps %s to an explicit failure", async (code, status) => {
    disputeMock.mockResolvedValue({ ok: false, code, reason: "Denied" });
    expect((await POST(request())).status).toBe(status);
  });
  it("returns a failure when persistence is unavailable", async () => {
    disputeMock.mockRejectedValue(new Error("private database failure"));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("private database");
  });
});
