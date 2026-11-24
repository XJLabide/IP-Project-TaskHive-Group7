import { beforeEach, expect, it, vi } from "vitest";
const { auth, totals, section } = vi.hoisted(() => ({ auth: vi.fn(), totals: vi.fn(), section: vi.fn() }));
vi.mock("@/lib/api/response", () => ({ requireAdmin: auth, ok: (data: unknown) => Response.json({ data }), problem: (error: string, status: number) => Response.json({ error }, { status }) }));
vi.mock("@/lib/support/reads", () => ({ getAdminTotals: totals, getAdminSection: section }));
import { GET } from "./route";
beforeEach(() => { vi.clearAllMocks(); auth.mockResolvedValue({ response: null }); totals.mockResolvedValue({ users: 42, platformFeesCents: 500 }); section.mockResolvedValue({ items: [], pagination: { page: 1 } }); });
it("denies overview access before reading private data", async () => {
  auth.mockResolvedValue({ response: new Response(null, { status: 401 }) });
  expect((await GET(new Request("https://example.test/api/admin/dashboard"))).status).toBe(401);
  expect(totals).not.toHaveBeenCalled(); expect(section).not.toHaveBeenCalled();
});
it("reads totals and a bounded reports page without loading other queues", async () => {
  const response = await GET(new Request("https://example.test/api/admin/dashboard"));
  expect(totals).toHaveBeenCalledWith(true); expect(section).toHaveBeenCalledWith("reports");
  expect(await response.json()).toMatchObject({ data: { totals: { users: 42 }, reports: [], pagination: { page: 1 } } });
});
it("does not disclose persistence error details", async () => {
  totals.mockRejectedValue(new Error("private database connection"));
  const response = await GET(new Request("https://example.test/api/admin/dashboard"));
  expect(response.status).toBe(503); expect(await response.text()).not.toContain("private database");
});
