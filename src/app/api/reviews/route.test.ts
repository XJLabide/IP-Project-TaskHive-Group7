import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUserMock, submitReviewMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(), submitReviewMock: vi.fn(),
}));
vi.mock("@/lib/api/response", () => ({
  requireUser: requireUserMock,
  created: (data: unknown) => Response.json({ data }, { status: 201 }),
  problem: (error: string, status = 400) => Response.json({ error }, { status }),
}));
vi.mock("@/lib/completion/service", () => ({ submitReview: submitReviewMock }));
import { POST } from "./route";
const request = (body = JSON.stringify({ taskId: "task_1", rating: 5, comment: "Good work" })) => new Request("https://example.test/api/reviews", { method: "POST", body });

beforeEach(() => {
  vi.clearAllMocks();
  requireUserMock.mockResolvedValue({ session: { user: { id: "poster_1" } }, response: null });
  submitReviewMock.mockResolvedValue({ ok: true, reviewId: "persisted_review", published: false, publishAt: new Date("2026-12-06") });
});

describe("review creation API", () => {
  it("returns the real service result with identity taken from the session", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect((await response.json()).data.reviewId).toBe("persisted_review");
    expect(submitReviewMock).toHaveBeenCalledWith({ taskId: "task_1", reviewerId: "poster_1", rating: 5, comment: "Good work" });
  });

  it.each(["{", "null", "[]", '{}', '{"taskId":"task_1","rating":2.5}', '{"taskId":" ","rating":5}', JSON.stringify({ taskId: "task_1", rating: 5, comment: "x".repeat(2001) })])("rejects invalid input %s without writing", async (body) => {
    expect((await POST(request(body))).status).toBe(422);
    expect(submitReviewMock).not.toHaveBeenCalled();
  });

  it("ignores submitted identities and leaves counterpart selection to the service", async () => {
    await POST(request(JSON.stringify({ taskId: "task_1", rating: 5, revieweeId: "forged", reviewerId: "forged" })));
    expect(submitReviewMock).toHaveBeenCalledWith({ taskId: "task_1", reviewerId: "poster_1", rating: 5, comment: undefined });
  });

  it("requires a session before parsing or saving", async () => {
    requireUserMock.mockResolvedValue({ session: null, response: Response.json({ error: "Authentication required" }, { status: 401 }) });
    expect((await POST(request("{"))).status).toBe(401);
    expect(submitReviewMock).not.toHaveBeenCalled();
  });

  it.each([["not_participant", 403], ["not_found", 404], ["not_unlocked", 409], ["already_reviewed", 409]])("propagates %s rather than claiming success", async (code, status) => {
    submitReviewMock.mockResolvedValue({ ok: false, code, reason: "Denied" });
    const response = await POST(request());
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: "Denied", code });
  });

  it("does not return success or leak database errors when persistence fails", async () => {
    submitReviewMock.mockRejectedValue(new Error("private database error"));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("private database");
  });

});
