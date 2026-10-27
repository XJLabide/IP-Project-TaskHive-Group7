"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const fieldClass =
  "h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#D19300] focus:ring-2 focus:ring-[#FFC800]/25 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-[#FFD50D]";

export function ReviewForm({
  taskId,
  counterpart,
  role,
}: {
  taskId: string;
  counterpart: string;
  role: "poster" | "tasker";
}) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/tasks/${taskId}/reviews`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(
          typeof body.error === "string"
            ? body.error
            : "Could not save your review. Please try again.",
        );
        return;
      }

      setComment("");
      setMessage("Review saved. It stays hidden until the other review or the 14-day window.");
      router.refresh();
    } catch {
      setError("Could not save your review. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit}>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        You are reviewing <strong className="text-zinc-950 dark:text-zinc-50">{counterpart}</strong>{" "}
        as the {role === "poster" ? "Poster" : "Tasker"}.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold" htmlFor={`rating-${taskId}`}>
          Rating
        </label>
        <select
          className={fieldClass}
          id={`rating-${taskId}`}
          onChange={(event) => setRating(Number(event.target.value))}
          value={rating}
        >
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value} — {value === 5 ? "Excellent" : value === 1 ? "Poor" : "Good"}
            </option>
          ))}
        </select>
      </div>

      <label className="grid gap-2 text-sm font-semibold">
        Review
        <textarea
          className="min-h-24 rounded-xl border border-zinc-200 bg-white p-3 text-sm font-normal outline-none focus:border-[#D19300] focus:ring-2 focus:ring-[#FFC800]/25 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-[#FFD50D]"
          maxLength={2000}
          onChange={(event) => setComment(event.target.value)}
          placeholder="What should other participants know?"
          value={comment}
        />
      </label>

      {error ? (
        <p className="text-sm font-medium text-[#a01a26] dark:text-[#F04452]" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          aria-live="polite"
          className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <Button className="w-fit" disabled={pending} size="sm" type="submit">
        {pending ? "Saving…" : "Submit review"}
      </Button>
    </form>
  );
}
