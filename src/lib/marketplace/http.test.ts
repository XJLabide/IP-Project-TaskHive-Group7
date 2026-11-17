import { afterEach, describe, expect, it, vi } from "vitest";
import { requestData } from "./http";

describe("requestData", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns the API data envelope for successful requests", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { taskId: "task-1" } }), { status: 201 }),
    ));

    await expect(requestData<{ taskId: string }>("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Task" }),
    })).resolves.toEqual({ taskId: "task-1" });
  });

  it("preserves API error codes and messages for actionable failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Complete your profile first.", code: "profile_incomplete" }), { status: 403 }),
    ));

    await expect(requestData("/api/tasks", { method: "POST" })).rejects.toMatchObject({
      message: "Complete your profile first.",
      code: "profile_incomplete",
      status: 403,
    });
  });

  it("fails closed when the server returns an invalid success payload", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    ));

    await expect(requestData("/api/tasks")).rejects.toThrow("Invalid server response");
  });
});
