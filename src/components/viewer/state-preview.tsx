"use client";

import { useViewer } from "./viewer-provider";
import { previewKinds, type PreviewKind } from "@/lib/viewer/demo";

const labels: Record<PreviewKind, string> = {
  guest: "Guest visitor",
  incomplete: "Signed in, profile incomplete",
  pending: "Tasker, verification pending",
  rejected: "Tasker, rejected (appeal open)",
  appealed: "Tasker, appeal under review",
  verified: "Verified Tasker",
  admin: "Admin",
};

/**
 * Demo-only control for reviewing every gate without a backend session.
 * It never changes server state; it only switches which viewer the UI renders.
 */
export function StatePreview({ className }: { className?: string }) {
  const { previewKind, setPreviewKind, isPreview } = useViewer();

  return (
    <div
      className={`rounded-2xl border border-dashed border-zinc-300 p-3 dark:border-zinc-700 ${className ?? ""}`}
    >
      <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
        State preview
        <select
          className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-xs font-medium normal-case tracking-normal text-zinc-700 outline-none focus-visible:border-[#D19300] focus-visible:ring-2 focus-visible:ring-[#FFD50D] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:focus-visible:border-[#FFD50D]"
          onChange={(event) =>
            setPreviewKind(
              event.target.value === "off" ? null : (event.target.value as PreviewKind),
            )
          }
          value={previewKind ?? "off"}
        >
          <option value="off">Real session (guest)</option>
          {previewKinds.map((kind) => (
            <option key={kind} value={kind}>
              {labels[kind]}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-2 text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
        {isPreview
          ? "Demo state. No account data is used and nothing is saved."
          : "Sign-in is not connected in this prototype, so the app renders a guest."}
      </p>
    </div>
  );
}
