import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DashboardAttention, DashboardHero } from "./overview";
import type { DashboardAction } from "@/lib/dashboard/data";

const now = new Date("2026-11-09T08:00:00Z");

describe("dashboard overview", () => {
  it("omits attention when there is nothing to act on", () => {
    expect(renderToStaticMarkup(createElement(DashboardAttention, { actions: [], applicationCount: 0, now }))).toBe("");
  });

  it("shows three earliest payment actions and a grouped review link", () => {
    const actions: DashboardAction[] = [4, 2, 3, 1].map((day) => ({
      id: String(day), taskId: String(day), taskTitle: `Task ${day}`,
      kind: "complete_payment", label: "Complete payment", tone: "pending",
      href: `/tasks/${day}`, dueAt: `2026-11-${10 + day}T08:00:00Z`,
    }));
    const html = renderToStaticMarkup(createElement(DashboardAttention, { actions, applicationCount: 2, now }));
    expect(html.indexOf("Task 1")).toBeLessThan(html.indexOf("Task 2"));
    expect(html.indexOf("Task 2")).toBeLessThan(html.indexOf("Task 3"));
    expect(html).not.toContain("Task 4");
    expect(html).toContain("2 applications to review");
    expect(html).toContain('href="/my-work"');
  });

  it("offers sign-in to guests and profile completion to incomplete accounts", () => {
    const guest = renderToStaticMarkup(createElement(DashboardHero, { canPost: false, signedIn: false, name: null }));
    expect(guest).toContain('href="/login"');
    expect(guest).not.toContain('aria-label="Account shortcuts"');
    const incomplete = renderToStaticMarkup(createElement(DashboardHero, { canPost: false, signedIn: true, name: "Ana" }));
    expect(incomplete).toContain("Complete profile");
    expect(incomplete).toContain("Welcome back, Ana.");
  });
});
