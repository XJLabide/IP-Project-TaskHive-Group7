import { NextRequest } from "next/server";
import { afterEach, expect, it, vi } from "vitest";
import { proxy } from "./proxy";
import { config } from "./proxy";
// This installed Next.js build retains the legacy name for its matcher helper.
import { unstable_doesMiddlewareMatch as doesProxyMatch } from "next/experimental/testing/server";

afterEach(() => vi.unstubAllEnvs());
const supplied = "11111111-1111-4111-8111-111111111111";
it("generates an opaque request ID and overrides a client-supplied internal ID", () => {
  const response = proxy(new NextRequest("https://taskhive.example/api/users/me", { headers: { "x-taskhive-request-id": supplied } }));
  const id = response.headers.get("x-request-id");
  expect(id).toMatch(/^[0-9a-f-]{36}$/);
  expect(id).not.toBe(supplied);
  expect(response.headers.get("x-middleware-request-x-taskhive-request-id")).toBe(id);
  expect(response.status).toBe(200);
});
it("preserves the dashboard guest redirect with a correlation ID", () => {
  vi.stubEnv("NODE_ENV", "production");
  const response = proxy(new NextRequest("https://taskhive.example/dashboard"));
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe("https://taskhive.example/login");
  expect(response.headers.get("x-request-id")).toBeTruthy();
});
it("does not redirect other guest pages and gives each request a distinct ID", () => {
  const a = proxy(new NextRequest("https://taskhive.example/login"));
  const b = proxy(new NextRequest("https://taskhive.example/login"));
  expect(a.status).toBe(200); expect(b.status).toBe(200);
  expect(a.headers.get("x-request-id")).not.toBe(b.headers.get("x-request-id"));
});

it.each(["/profile", "/admin", "/api/auth/session", "/api/users/me", "/api/tasks/unknown.png", "/tasks/unknown.webp"])("stamps application requests to %s", url => {
  expect(doesProxyMatch({ config, nextConfig: {}, url })).toBe(true);
});
it.each(["/_next/static/chunk.js", "/_next/image?url=avatar.png", "/favicon.ico", "/images/category.webp"])("skips asset requests to %s", url => {
  expect(doesProxyMatch({ config, nextConfig: {}, url })).toBe(false);
});
