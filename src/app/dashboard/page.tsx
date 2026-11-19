import { guardPage } from "@/lib/auth/guard";
import DashboardClient from "@/app/dashboard/dashboard-client";
import { previewKinds } from "@/lib/viewer/demo";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string | string[] }>;
}) {
  const preview = (await searchParams).as;
  const previewAllowed = process.env.NODE_ENV !== "production" && typeof preview === "string" && previewKinds.includes(preview as (typeof previewKinds)[number]);
  if (!previewAllowed) await guardPage("view_private_account");
  return <DashboardClient developmentPreview={previewAllowed} />;
}
