import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { can, type MarketplaceAction } from "@/lib/domain/access";
import { loadActorFromHeaders } from "./actor";

/**
 * Server-side guard for private pages. Guests go to sign-in; signed-in
 * accounts that fail a gate go back to the dashboard.
 */
export async function guardPage(action: MarketplaceAction): Promise<void> {
  const actor = await loadActorFromHeaders(await headers());
  const decision = can(actor, action);

  if (decision.allowed) return;

  redirect(decision.code === "sign_in_required" ? "/login" : "/dashboard");
}
