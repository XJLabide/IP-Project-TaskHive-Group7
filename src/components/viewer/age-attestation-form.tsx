"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function AgeAttestationForm() {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmed) return;

    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ageAttested: true }),
      });

      if (!response.ok) {
        setError("Could not save your attestation. Please try again.");
        return;
      }

      router.refresh();
    } catch {
      setError("Could not save your attestation. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardContent className="grid gap-4 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-bold">Confirm you’re 18 or older</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            This self-attestation unlocks posting tasks and applying for work. We don’t ask for your
            birth date or an ID here.
          </p>
        </div>

        <form className="grid justify-items-start gap-4" onSubmit={handleSubmit}>
          <label className="flex items-start gap-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
            <input
              checked={confirmed}
              className="mt-1 h-4 w-4 accent-[#D19300]"
              onChange={(event) => setConfirmed(event.target.checked)}
              required
              type="checkbox"
            />
            <span>I confirm that I am at least 18 years old.</span>
          </label>

          {error ? (
            <p className="text-sm font-medium text-[#a01a26] dark:text-[#F04452]" role="alert">
              {error}
            </p>
          ) : null}

          <Button disabled={!confirmed || pending} size="sm" type="submit">
            {pending ? "Saving…" : "Confirm and continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
