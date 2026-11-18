import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUserMock, getDashboardDataMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  getDashboardDataMock: vi.fn(),
}));

vi.mock("@/lib/api/response", () => ({
  requireUser: requireUserMock,
  ok: (data: unknown) => Response.json({ data }),
}));
vi.mock("@/lib/dashboard/service", () => ({ getDashboardData: getDashboardDataMock }));

import { GET } from "./route";

describe("GET /api/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue({ session: { user: { id: "user-1" } }, response: null });
    getDashboardDataMock.mockResolvedValue({ scope: "empty", displayName: "Poster" });
  });

  it("loads a dashboard scoped to the authenticated account", async () => {
    const response = await GET(new Request("https://taskhive.example/api/dashboard"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { scope: "empty", displayName: "Poster" } });
    expect(getDashboardDataMock).toHaveBeenCalledWith("user-1");
  });

  it("returns the authentication failure without reading another account", async () => {
    const authResponse = Response.json({ error: "Authentication required" }, { status: 401 });
    requireUserMock.mockResolvedValue({ session: null, response: authResponse });
    expect(await GET(new Request("https://taskhive.example/api/dashboard"))).toBe(authResponse);
    expect(getDashboardDataMock).not.toHaveBeenCalled();
  });
});
