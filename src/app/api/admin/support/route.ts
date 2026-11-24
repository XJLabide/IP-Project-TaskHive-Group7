import { ok, problem, requireAdmin } from "@/lib/api/response";
import { getAdminSection, listSupportQueue } from "@/lib/support/reads";
import { adminPage, adminPages, adminSections, type AdminSection } from "@/lib/support/pagination";

export const runtime = "nodejs";

/** Admin v1 queue: reports, disputes, cancellations, and verification appeals. */
export async function GET(request: Request) {
  const authResult = await requireAdmin(request);
  if (authResult.response) return authResult.response;

  const params = new URL(request.url).searchParams;
  let section: AdminSection | null = null;
  let page = 1;
  let pages;
  try {
    if (params.has("section")) {
      const candidate = params.get("section");
      if (params.getAll("section").length !== 1 || !adminSections.includes(candidate as AdminSection)) throw new Error();
      if (params.getAll("page").length > 1) throw new Error();
      section = candidate as AdminSection;
      page = adminPage(params.get("page"));
    } else pages = adminPages(params);
  } catch { return problem("Invalid Admin queue or page", 422); }
  try {
    return ok(section ? { section, ...await getAdminSection(section, page) } : await listSupportQueue(pages));
  } catch { return problem("Support queues could not load. Try again.", 503); }
}
