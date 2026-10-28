const fallbackHref = "/my-work";
const validationOrigin = "https://taskhive.invalid";

export function safeNotificationHref(href: string | null | undefined) {
  if (!href || !href.startsWith("/") || href.startsWith("//") || href.includes("\\")) {
    return fallbackHref;
  }

  const target = new URL(href, validationOrigin);
  return target.origin === validationOrigin
    ? `${target.pathname}${target.search}${target.hash}`
    : fallbackHref;
}

export function absoluteNotificationUrl(
  href: string | null | undefined,
  appUrl: string,
) {
  const origin = new URL(appUrl);
  if (origin.protocol !== "https:" && origin.protocol !== "http:") {
    throw new Error("TaskHive app URL must use HTTP or HTTPS.");
  }

  return new URL(safeNotificationHref(href), origin).toString();
}
