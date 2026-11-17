// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { searchMock } = vi.hoisted(() => ({ searchMock: vi.fn(() => new URLSearchParams("taskId=task_1")) }));
vi.mock("next/navigation", () => ({
  useSearchParams: searchMock,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => createElement("main", null, children),
}));

import CheckoutPage from "./page";

let container: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  searchMock.mockReturnValue(new URLSearchParams("taskId=task_1"));
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(createElement(CheckoutPage)));
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("checkout page", () => {
  it("starts hosted checkout without collecting payment details or claiming payment succeeded", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { provider: "stripe", checkoutUrl: "https://checkout.stripe.com/c/pay/session" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const button = [...container.querySelectorAll("button")].find((element) => element.textContent?.includes("Continue to payment"));
    expect(button).toBeDefined();
    expect(container.querySelectorAll("input")).toHaveLength(0);
    await act(async () => button!.click());
    expect(fetchMock).toHaveBeenCalledWith("/api/payments/checkout", expect.objectContaining({ method: "POST", body: JSON.stringify({ taskId: "task_1" }) }));
    expect(container.textContent).not.toMatch(/payment (confirmed|successful)/i);
    expect(container.querySelector('a[href="https://checkout.stripe.com/c/pay/session"]')).not.toBeNull();
  });
});

describe("checkout failures", () => {
  it("shows a server error without displaying a payment link", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "The payment provider could not start checkout." }) }));
    const button = [...container.querySelectorAll("button")].find((element) => element.textContent?.includes("Continue to payment"));
    await act(async () => button!.click());
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("could not start checkout");
    expect(container.querySelector('a[href^="https://checkout."]')).toBeNull();
  });

  it("rejects a checkout link that is not hosted by the named provider", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { provider: "stripe", checkoutUrl: "https://example.com/checkout" } }) }));
    const button = [...container.querySelectorAll("button")].find((element) => element.textContent?.includes("Continue to payment"));
    await act(async () => button!.click());
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("unavailable");
    expect(container.querySelector('a[href="https://example.com/checkout"]')).toBeNull();
  });

  it("offers real pending tasks when opened without a task ID", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { tasks: [{ id: "task_real", title: "Deliver groceries" }] } }) }));
    searchMock.mockReturnValue(new URLSearchParams());
    await act(async () => root.render(createElement(CheckoutPage)));
    expect(container.textContent).toContain("Deliver groceries");
    expect(container.querySelector('a[href="/checkout?taskId=task_real"]')).not.toBeNull();
  });


  it("does not claim payment or offer another checkout after a provider return", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { status: "pending" } }) }));
    searchMock.mockReturnValue(new URLSearchParams("taskId=task_1&payment=success"));
    await act(async () => root.render(createElement(CheckoutPage)));
    expect(container.textContent).toContain("Waiting for payment confirmation");
    expect(container.textContent).not.toMatch(/payment confirmed/i);
    expect([...container.querySelectorAll("button")].some((button) => button.textContent?.includes("Continue to payment"))).toBe(false);
  });


  it("does not reuse a provider link after navigating to a different task", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { provider: "stripe", checkoutUrl: "https://checkout.stripe.com/c/pay/task_a" } }) }));
    const button = [...container.querySelectorAll("button")].find((element) => element.textContent?.includes("Continue to payment"));
    await act(async () => button!.click());
    expect(container.querySelector('a[href="https://checkout.stripe.com/c/pay/task_a"]')).not.toBeNull();
    searchMock.mockReturnValue(new URLSearchParams("taskId=task_b"));
    await act(async () => root.render(createElement(CheckoutPage)));
    expect(container.querySelector('a[href="https://checkout.stripe.com/c/pay/task_a"]')).toBeNull();
  });


  it("shows confirmation only after the server reports a confirmed payment", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { status: "confirmed" } }) }));
    searchMock.mockReturnValue(new URLSearchParams("taskId=task_1&payment=success"));
    await act(async () => root.render(createElement(CheckoutPage)));
    expect(container.textContent).toContain("Payment confirmed");
  });


  it("opens only the Maya sandbox hosted checkout URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { provider: "maya", checkoutUrl: "https://payments-web-sandbox.paymaya.com/checkout/1" } }) });
    vi.stubGlobal("fetch", fetchMock);
    const button = [...container.querySelectorAll("button")].find((element) => element.textContent?.includes("Continue to payment"));
    await act(async () => button!.click());
    expect(container.querySelector('a[href="https://payments-web-sandbox.paymaya.com/checkout/1"]')).not.toBeNull();
  });

});
