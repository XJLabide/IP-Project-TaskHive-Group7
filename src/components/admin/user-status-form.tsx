"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function UserStatusForm({
  userId,
  status,
}: {
  userId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const next = status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";

  async function handleClick() {
    if (
      !window.confirm(
        next === "SUSPENDED"
          ? "Suspend this account? The user will lose marketplace access."
          : "Reinstate this account?",
      )
    ) {
      return;
    }

    setPending(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(
          typeof body.error === "string"
            ? body.error
            : "Could not update this account.",
        );
        return;
      }

      router.refresh();
    } catch {
      setError("Could not update this account. Check your connection.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-1">
      <Button
        disabled={pending}
        onClick={handleClick}
        size="sm"
        type="button"
        variant="outline"
      >
        {pending
          ? "Saving…"
          : next === "SUSPENDED"
            ? "Suspend account"
            : "Reinstate account"}
      </Button>
      {error ? (
        <p className="text-xs text-[#a01a26] dark:text-[#F04452]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
