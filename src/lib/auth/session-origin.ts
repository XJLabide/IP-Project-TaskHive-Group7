const localOrigins = ["http://localhost:3000", "http://localhost:3001"];

function configuredOrigins() {
  const origins = [process.env.NEXT_PUBLIC_APP_URL, ...localOrigins];

  for (const host of [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]) {
    if (host) origins.push(`https://${host}`);
  }

  return new Set(origins.filter((value): value is string => Boolean(value)).map((value) => new URL(value).origin));
}

export function isAllowedSessionOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return configuredOrigins().has(new URL(origin).origin);
  } catch {
    return false;
  }
}
