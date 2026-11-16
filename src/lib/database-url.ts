/** Use Supabase's transaction pooler for Vercel's short-lived server functions. */
export function runtimeDatabaseUrl(value: string | undefined, onVercel: boolean) {
  if (!value || !onVercel) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return value;
  }

  if (!url.hostname.endsWith(".pooler.supabase.com") || !["5432", "6543"].includes(url.port)) {
    return value;
  }

  url.port = "6543";
  url.searchParams.set("pgbouncer", "true");
  if (!url.searchParams.has("connection_limit")) {
    url.searchParams.set("connection_limit", "2");
  }
  return url.toString();
}
