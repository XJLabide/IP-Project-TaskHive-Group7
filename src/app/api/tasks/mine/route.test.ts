import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUserMock, listOwnedTasksMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  listOwnedTasksMock: vi.fn(),
}));

vi.mock("@/lib/api/response", () => ({
  requireUser: requireUserMock,
  ok: (data: unknown) => Response.json({ data }),
}));
vi.mock("@/lib/tasks/owner-service", () => ({ listOwnedTasks: listOwnedTasksMock }));

import { GET } from "./route";

describe("GET /api/tasks/mine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue({ session: { user: { id: "poster-1" } }, response: null });
    listOwnedTasksMock.mockResolvedValue([]);
  });

  it("returns only the signed-in Poster’s tasks, including private drafts", async () => {
    listOwnedTasksMock.mockResolvedValue([{ id: "draft-1", status: "draft" }]);

    const response = await GET(new Request("https://taskhive.example/api/tasks/mine"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [{ id: "draft-1", status: "draft" }] });
    expect(listOwnedTasksMock).toHaveBeenCalledWith("poster-1");
  });

  it("returns the authentication response without querying another user’s tasks", async () => {
    const response = Response.json({ error: "Authentication required" }, { status: 401 });
    requireUserMock.mockResolvedValue({ session: null, response });

    expect(await GET(new Request("https://taskhive.example/api/tasks/mine"))).toBe(response);
    expect(listOwnedTasksMock).not.toHaveBeenCalled();
  });
});
