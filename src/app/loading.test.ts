import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const viewer = vi.hoisted(() => ({ signedIn: false, isAdmin: false }));

vi.mock("@/components/viewer/viewer-provider", () => ({
  useViewer: () => ({ viewer }),
}));
vi.mock("@/components/layout/app-shell", async () => {
  const { createElement } = await import("react");
  return { AppShell: ({ children }: { children: ReactNode }) => createElement("div", { "data-shell": "workspace" }, children) };
});
vi.mock("@/components/layout/public-shell", async () => {
  const { createElement } = await import("react");
  return { PublicShell: ({ children }: { children: ReactNode }) => createElement("div", { "data-shell": "public" }, children) };
});

import AppLoading from "./loading";
import DashboardLoading from "./dashboard/loading";
import ReviewsLoading from "./reviews/loading";
import AdminPageLoading from "./admin/loading";

describe("root loading shell", () => {
  it("shows public loading chrome to a guest", () => {
    viewer.signedIn = false;
    const html = renderToStaticMarkup(createElement(AppLoading));
    expect(html).toContain('data-shell="public"');
    expect(html).not.toContain('data-shell="workspace"');
  });

  it("keeps workspace loading chrome for a signed-in viewer", () => {
    viewer.signedIn = true;
    const html = renderToStaticMarkup(createElement(AppLoading));
    expect(html).toContain('data-shell="workspace"');
  });
});

describe("private route loading shells", () => {
  it.each([
    ["dashboard", DashboardLoading],
    ["reviews", ReviewsLoading],
    ["admin", AdminPageLoading],
  ])("does not show %s workspace loading to a guest", (_name, Loading) => {
    viewer.signedIn = false;
    viewer.isAdmin = false;
    const html = renderToStaticMarkup(createElement(Loading));
    expect(html).toContain('data-shell="public"');
    expect(html).not.toContain('data-shell="workspace"');
  });

  it("does not show the Admin skeleton to a non-Admin account", () => {
    viewer.signedIn = true;
    viewer.isAdmin = false;
    const html = renderToStaticMarkup(createElement(AdminPageLoading));
    expect(html).toContain('data-shell="public"');
  });

  it.each([
    ["dashboard", DashboardLoading],
    ["reviews", ReviewsLoading],
  ])("keeps %s workspace loading for a signed-in account", (_name, Loading) => {
    viewer.signedIn = true;
    viewer.isAdmin = false;
    const html = renderToStaticMarkup(createElement(Loading));
    expect(html).toContain('data-shell="workspace"');
  });

  it("keeps Admin workspace loading for an Admin account", () => {
    viewer.signedIn = true;
    viewer.isAdmin = true;
    const html = renderToStaticMarkup(createElement(AdminPageLoading));
    expect(html).toContain('data-shell="workspace"');
  });
});
