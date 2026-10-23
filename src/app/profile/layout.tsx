import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { loadActorFromHeaders } from "@/lib/auth/actor";
import { can } from "@/lib/domain/access";
import { ViewerProvider } from "@/components/viewer/viewer-provider";
import { viewerSnapshot } from "@/lib/viewer/presentation";

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await loadActorFromHeaders(await headers());

  if (!can(actor, "view_private_account").allowed) redirect("/login");

  return (
    <ViewerProvider initialViewer={viewerSnapshot(actor)}>{children}</ViewerProvider>
  );
}
