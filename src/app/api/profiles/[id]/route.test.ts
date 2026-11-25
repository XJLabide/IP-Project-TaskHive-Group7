import { beforeEach, describe, expect, it, vi } from "vitest";
const { getProfile } = vi.hoisted(() => ({ getProfile: vi.fn() }));
vi.mock("@/lib/profiles/public-profile", () => ({ getPublicProfile: getProfile }));
vi.mock("@/lib/api/response", () => ({
  ok: (data: unknown, init?: ResponseInit) => Response.json({ data }, init),
  problem: (error: string, status = 400) => Response.json({ error }, { status }),
}));
import { GET } from "./route";
const request = () => GET(new Request("https://example.test/api/profiles/member_1"), { params: Promise.resolve({ id: "member_1" }) });
beforeEach(() => vi.clearAllMocks());
describe("public profile API", () => {
  it("returns the stored profile for the requested ID without caching", async () => {
    getProfile.mockResolvedValue({ id: "member_1", name: "Actual member", taskerRating: null });
    const response = await request();
    expect(await response.json()).toEqual({ data: { id: "member_1", name: "Actual member", taskerRating: null } });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(getProfile).toHaveBeenCalledWith("member_1");
  });
  it("returns 404 for missing or unavailable accounts", async () => {
    getProfile.mockResolvedValue(null);
    expect((await request()).status).toBe(404);
  });
  it("returns 503 instead of sample data when reads fail", async () => {
    getProfile.mockRejectedValue(new Error("private database failure"));
    const response = await request();
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("private database");
  });
});
