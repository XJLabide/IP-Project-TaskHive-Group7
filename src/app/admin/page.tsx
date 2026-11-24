import Link from "next/link";
import { guardPage } from "@/lib/auth/guard";
import { AdminWorkspace } from "@/components/admin/workspace";
import { adminPages } from "@/lib/support/pagination";
import { AppShell } from "@/components/layout/app-shell";

export const runtime = "nodejs";

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await guardPage("review_verification_appeal");
  const values = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    for (const part of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, part);
  }
  let pages;
  try { pages = adminPages(params); }
  catch { return <AppShell title="Global Admin" description="Support queues and marketplace oversight."><p role="alert">This queue page is invalid. <Link className="underline" href="/admin">Return to the first pages</Link>.</p></AppShell>; }
  return <AdminWorkspace pages={pages} />;
}
