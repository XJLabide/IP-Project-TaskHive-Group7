import { expect, it } from "vitest";
import { adminPage, adminPages, adminPageHref } from "./pagination";

it.each(["0", "-1", "1.2", "1e3", "Infinity", "2147483648", ["1", "2"], NaN])("rejects unsafe Admin page %j", value => {
  expect(() => adminPage(value)).toThrow();
});
it("preserves other queue pages and excludes unrelated URL parameters", () => {
  const pages = adminPages(new URLSearchParams("reportsPage=2&recentUsersPage=3&unrelated=secret"));
  expect(adminPageHref("reports", 3, pages)).toBe("/admin?reportsPage=3&recentUsersPage=3#reports");
  expect(adminPageHref("reports", 1, pages)).toBe("/admin?recentUsersPage=3#reports");
});
it("rejects repeated page parameters and defaults absent pages", () => {
  expect(() => adminPages(new URLSearchParams("reportsPage=1&reportsPage=2"))).toThrow();
  expect(adminPages(new URLSearchParams()).reports).toBe(1);
});
