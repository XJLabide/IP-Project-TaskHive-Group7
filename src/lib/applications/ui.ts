import { applicationStatusLabel, type DemoApplication } from "./demo";

/** Shared badge styling for application status and verification state. */
export function applicationStatusClass(status: DemoApplication["status"]): string {
  if (status === "accepted") {
    return "border-[#75D333]/40 bg-[#75D333]/15 text-[#2f6b12] dark:text-[#75D333]";
  }
  if (status === "submitted") {
    return "border-[#FFC800]/40 bg-[#FFD50D]/20 text-zinc-700 dark:bg-[#FFC800]/15 dark:text-zinc-200";
  }
  return "border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}

export function verificationClass(verification: DemoApplication["verification"]): string {
  if (verification === "verified") {
    return "border-[#75D333]/40 bg-[#75D333]/15 text-[#2f6b12] dark:text-[#75D333]";
  }
  if (verification === "rejected") {
    return "border-[#F04452]/40 bg-[#F04452]/10 text-[#a01a26] dark:text-[#F04452]";
  }
  return "border-[#FFC800]/40 bg-[#FFD50D]/20 text-zinc-700 dark:bg-[#FFC800]/15 dark:text-zinc-200";
}

export function verificationLabel(verification: DemoApplication["verification"]): string {
  if (verification === "verified") return "Verified";
  if (verification === "rejected") return "Verification rejected";
  if (verification === "pending") return "Pending verification";
  return "Verification not started";
}

export { applicationStatusLabel };
