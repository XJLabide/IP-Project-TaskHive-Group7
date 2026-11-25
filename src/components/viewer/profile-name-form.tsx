"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ProfileNameForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!response.ok) {
        setError("Could not save your name. Please try again.");
        return;
      }

      router.refresh();
    } catch {
      setError("Could not save your name. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="grid gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800" onSubmit={handleSubmit}>
      <label className="grid gap-1.5 text-sm font-semibold" htmlFor="profile-name">
        Your name
        <input
          autoComplete="name"
          className="h-10 rounded-lg border border-zinc-300 bg-white px-3 font-normal text-zinc-950 outline-none focus-visible:border-[#D19300] focus-visible:ring-2 focus-visible:ring-[#FFD50D] dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          id="profile-name"
          maxLength={80}
          minLength={2}
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
      </label>
      {error && <p className="text-sm text-[#a01a26] dark:text-[#F04452]" role="alert">{error}</p>}
      <Button className="w-fit" disabled={pending || name.trim().length < 2} size="sm" type="submit">
        {pending ? "Saving…" : "Save name"}
      </Button>
    </form>
  );
}
