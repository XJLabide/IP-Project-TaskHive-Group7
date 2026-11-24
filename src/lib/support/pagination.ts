export const adminSections = ["reports", "disputes", "cancellations", "verificationAppeals", "recentTasks", "recentUsers", "recentDecisions"] as const;
export type AdminSection = typeof adminSections[number];
export const ADMIN_PAGE_SIZE = 10;
export const MAX_ADMIN_PAGE = 2_147_483_647;
export const adminSectionLabels: Record<AdminSection, string> = {
  reports: "Reports", disputes: "Completion disputes", cancellations: "Cancellation requests",
  verificationAppeals: "Verification appeals", recentTasks: "Recent tasks", recentUsers: "Users", recentDecisions: "Recent decisions",
};

export function adminPage(value: unknown): number {
  if (value === undefined || value === null || value === "") return 1;
  const page = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(page) || page < 1 || page > MAX_ADMIN_PAGE) throw new Error("Invalid Admin page");
  return page;
}

export type AdminPages = Partial<Record<AdminSection, number>>;

export function adminPages(params: URLSearchParams): AdminPages {
  return Object.fromEntries(adminSections.map((section) => {
    const values = params.getAll(`${section}Page`);
    if (values.length > 1) throw new Error("Duplicate Admin page");
    return [section, adminPage(values[0])];
  }));
}

export function adminPageHref(section: AdminSection, page: number, pages: AdminPages): string {
  const params = new URLSearchParams();
  for (const name of adminSections) {
    const value = name === section ? page : pages[name] ?? 1;
    if (value > 1) params.set(`${name}Page`, String(adminPage(value)));
  }
  return `/admin${params.size ? `?${params}` : ""}#${section}`;
}
