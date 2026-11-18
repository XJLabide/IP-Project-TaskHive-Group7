import { redirect } from "next/navigation";
import { loadCurrentActor } from "@/lib/auth/current-actor";
import { can } from "@/lib/domain/access";

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await loadCurrentActor();

  if (!can(actor, "view_private_account").allowed) redirect("/login");

  return children;
}
