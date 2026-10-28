// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificationInbox } from "./inbox";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const notification = {
  id: "notice_1",
  type: "chat.message",
  title: "New message about a task",
  body: "A Tasker sent you a message. Sign in to read it.",
  href: "/tasks/task_1#chat",
  readAt: null,
  createdAt: "2026-10-28T08:00:00.000Z",
};

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => (status >= 400 ? { error: "Could not load notifications." } : { data }),
  };
}

let root: Root | undefined;
let host: HTMLDivElement | undefined;

async function mountInbox() {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(createElement(NotificationInbox, { signedIn: true }));
  });
}

function clickButton(label: string) {
  const button = [...document.querySelectorAll("button")].find((item) =>
    item.textContent?.includes(label),
  );
  if (!button) throw new Error(`Could not find button containing "${label}".`);
  button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  host?.remove();
  host = undefined;
  vi.unstubAllGlobals();
});

describe("notification inbox UI", () => {
  it("shows loading feedback before an empty inbox state", async () => {
    let finishLoad!: (value: ReturnType<typeof jsonResponse>) => void;
    const pending = new Promise<ReturnType<typeof jsonResponse>>((resolve) => {
      finishLoad = resolve;
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(pending));

    await mountInbox();
    expect(document.body.textContent).toContain("Loading notifications");

    await act(async () => {
      finishLoad(jsonResponse({ notifications: [], unreadCount: 0 }));
      await pending;
    });
    expect(document.body.textContent).toContain("No notifications yet");
  });

  it("offers a retry when the inbox request fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 500))
      .mockResolvedValueOnce(jsonResponse({ notifications: [], unreadCount: 0 }));
    vi.stubGlobal("fetch", fetchMock);

    await mountInbox();
    await act(async () => Promise.resolve());
    expect(document.body.textContent).toContain("We couldn't load notifications");

    await act(async () => {
      clickButton("Try again");
      await Promise.resolve();
    });
    expect(document.body.textContent).toContain("No notifications yet");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("asks the visitor to sign in when the inbox API has no authenticated session", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, 401)));

    await mountInbox();
    await act(async () => Promise.resolve());

    expect(document.body.textContent).toContain("Your session has expired");
    expect(document.querySelector('a[href="/login"]')).not.toBeNull();
  });

  it("shows unread state, filters unread items, marks read, and links to the related task", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ notifications: [notification], unreadCount: 1 }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: notification.id, readAt: "2026-10-28T09:00:00.000Z" }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await mountInbox();
    await act(async () => Promise.resolve());

    expect(document.body.textContent).toContain("1 unread");
    expect(document.body.textContent).toContain("Unread");
    expect(document.querySelector('a[href="/tasks/task_1#chat"]')).not.toBeNull();

    await act(async () => {
      clickButton("Unread");
      await Promise.resolve();
    });
    expect(document.body.textContent).toContain("New message about a task");

    await act(async () => {
      clickButton("Mark as read");
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/notifications/notice_1",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(document.body.textContent).toContain("0 unread");

    await act(async () => {
      clickButton("All");
      await Promise.resolve();
    });
    expect(document.body.textContent).toContain("Read");
  });
});
