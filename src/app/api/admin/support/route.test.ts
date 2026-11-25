import { beforeEach, expect, it, vi } from "vitest";
const { auth, section, all } = vi.hoisted(() => ({ auth: vi.fn(), section: vi.fn(), all: vi.fn() }));
vi.mock("@/lib/api/response", () => ({ requireAdmin: auth, ok: (data: unknown) => Response.json({ data }), problem: (error: string, status: number) => Response.json({ error }, { status }) }));
vi.mock("@/lib/support/reads", () => ({ getAdminSection: section, listSupportQueue: all }));
import { GET } from "./route";
beforeEach(() => { vi.clearAllMocks(); auth.mockResolvedValue({ response: null }); section.mockResolvedValue({ items: [], pagination: { page: 2 } }); });
it("denies private queue reads before parsing or querying", async () => {
  auth.mockResolvedValue({ response: new Response(null, { status: 403 }) });
  expect((await GET(new Request("https://example.test/api/admin/support?section=reports"))).status).toBe(403);
  expect(section).not.toHaveBeenCalled(); expect(all).not.toHaveBeenCalled();
});
it("loads only the requested section", async () => {
  expect((await GET(new Request("https://example.test/api/admin/support?section=reports&page=2"))).status).toBe(200);
  expect(section).toHaveBeenCalledWith("reports", 2); expect(all).not.toHaveBeenCalled();
});
it.each(["section=unknown", "section=reports&page=-1", "reportsPage=0", "section=reports&page=1&page=2"])("rejects invalid pagination %s", async query => {
  expect((await GET(new Request(`https://example.test/api/admin/support?${query}`))).status).toBe(422);
  expect(section).not.toHaveBeenCalled(); expect(all).not.toHaveBeenCalled();
});
it("returns a redacted retryable failure", async () => {
  section.mockRejectedValue(new Error("postgresql://secret"));
  const response = await GET(new Request("https://example.test/api/admin/support?section=reports"));
  expect(response.status).toBe(503); expect(await response.text()).not.toContain("secret");
});
