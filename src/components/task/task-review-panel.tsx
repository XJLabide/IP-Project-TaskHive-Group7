"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Stars } from "@/components/reviews/stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useViewer } from "@/components/viewer/viewer-provider";
import { formatChatTime } from "@/lib/chat/demo";
import type { DemoAssignment } from "@/lib/payments/demo";
import { useReviews } from "@/lib/mock-review-store";
import { reviewPublishAt } from "@/lib/completion/rules";
import type { TaskSummary } from "@/lib/tasks/types";

export function TaskReviewPanel({
  task,
  assignment,
  unlockedAt,
}: {
  task: TaskSummary;
  assignment: DemoAssignment;
  unlockedAt: string;
}) {
  const { viewer } = useViewer();
  const { reviewsForTask, submitReview, publishDue } = useReviews();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [feedback, setFeedback] = useState("");

  const isPoster = viewer.displayName === task.poster;
  const isTasker = viewer.displayName === assignment.tasker;
  const reviewer = viewer.displayName;
  const reviewee = isPoster ? assignment.tasker : task.poster;
  const reviews = reviewsForTask(task.id);
  const mine = reviewer
    ? reviews.find((review) => review.reviewer === reviewer)
    : undefined;
  const published = reviews.filter((review) => review.publishedAt);

  useEffect(() => {
    publishDue();
    const timer = window.setInterval(() => publishDue(), 60_000);
    return () => window.clearInterval(timer);
  }, [publishDue]);

  if (!viewer.signedIn || !reviewer || (!isPoster && !isTasker)) return null;

  function handleSubmit() {
    if (!reviewer) return;

    const result = submitReview({
      taskId: task.id,
      poster: task.poster,
      tasker: assignment.tasker,
      reviewer,
      reviewee,
      rating,
      comment,
      unlockedAt,
    });

    if (!result.ok) {
      setFeedback(result.reason);
      return;
    }

    setFeedback(
      result.published
        ? "Both reviews are in, so they are now public."
        : "Review saved. It stays hidden until the other participant reviews or the 14-day window closes.",
    );
    setComment("");
  }

  function simulateWindow() {
    const published = publishDue(reviewPublishAt(new Date(unlockedAt)));
    setFeedback(
      published > 0
        ? "Demo: the 14-day window closed and the review is now public."
        : "No hidden review is waiting for the window.",
    );
  }

  return (
    <section
      aria-labelledby="task-reviews-title"
      className="grid gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-bold" id="task-reviews-title">
            Reviews
          </h3>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Blind until both submit or 14 days after payout release.
          </p>
        </div>
        <Badge className="border-[#75D333]/40 bg-[#75D333]/15 text-[#2f6b12] dark:text-[#75D333]">
          Unlocked
        </Badge>
      </div>

      {mine ? (
        <div className="rounded-xl bg-zinc-50 p-3 text-sm dark:bg-zinc-800/60">
          <p className="flex items-center gap-2 font-semibold">
            {mine.publishedAt ? (
              "Your review is public"
            ) : (
              <>
                <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                Your review is hidden
              </>
            )}
          </p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-300">
            {mine.publishedAt
              ? `Published ${formatChatTime(mine.publishedAt)}.`
              : `Publishes when ${reviewee} reviews or on ${formatChatTime(mine.publishAt)}.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold" htmlFor={`task-rating-${task.id}`}>
              Rating
            </label>
            <select
              className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-[#D19300] focus:ring-2 focus:ring-[#FFC800]/25 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-[#FFD50D]"
              id={`task-rating-${task.id}`}
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
            Review {reviewee}
            <textarea
              className="min-h-20 rounded-xl border border-zinc-200 bg-white p-3 text-sm font-normal outline-none focus:border-[#D19300] focus:ring-2 focus:ring-[#FFC800]/25 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-[#FFD50D]"
              maxLength={2000}
              onChange={(event) => setComment(event.target.value)}
              placeholder="What should other participants know?"
              value={comment}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSubmit} size="sm" type="button">
              Submit review
            </Button>
            <Button asChild size="sm" type="button" variant="ghost">
              <Link href="/reviews">All reviews</Link>
            </Button>
          </div>
        </div>
      )}

      {feedback ? (
        <p
          aria-live="polite"
          className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300"
          role="status"
        >
          {feedback}
        </p>
      ) : null}

      {published.length > 0 ? (
        <ul className="grid gap-2">
          {published.map((review) => (
            <li
              className="rounded-xl border border-zinc-100 p-3 text-sm dark:border-zinc-800"
              key={review.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{review.reviewer}</span>
                <Stars rating={review.rating} />
              </div>
              {review.comment ? (
                <p className="mt-1 leading-6 text-zinc-600 dark:text-zinc-300">
                  {review.comment}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button onClick={simulateWindow} size="sm" type="button" variant="ghost">
          Simulate 14-day review window (demo)
        </Button>
      </div>
    </section>
  );
}
