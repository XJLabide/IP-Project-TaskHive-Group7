"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  publishDueDemoReviews,
  submitDemoReview,
  type DemoReview,
  type DemoReviewResult,
} from "@/lib/completion/demo";

const storageKey = "taskhive.mock-reviews.v1";

let reviewsSnapshot: DemoReview[] = [];
let initialized = false;
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(reviewsSnapshot));
  } catch {
    // Keep the in-memory store usable when storage is unavailable.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  if (!initialized && typeof window !== "undefined") {
    try {
      const stored = window.sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) reviewsSnapshot = parsed as DemoReview[];
      }
    } catch {
      reviewsSnapshot = [];
    }
    initialized = true;
    listeners.forEach((notify) => notify());
  }

  return () => listeners.delete(listener);
}

function notify() {
  persist();
  listeners.forEach((listener) => listener());
}

function submitReview(input: {
  taskId: string;
  poster: string;
  tasker: string;
  reviewer: string;
  reviewee: string;
  rating: number;
  comment: string | null;
  unlockedAt: string;
}): DemoReviewResult {
  const result = submitDemoReview({ reviews: reviewsSnapshot, ...input });

  if (result.ok) {
    reviewsSnapshot = result.reviews;
    notify();
  }

  return result;
}

function publishDue(now: Date = new Date()): number {
  const result = publishDueDemoReviews(reviewsSnapshot, now);

  if (result.published > 0) {
    reviewsSnapshot = result.reviews;
    notify();
  }

  return result.published;
}

export function useReviews() {
  const reviews = useSyncExternalStore(
    subscribe,
    () => reviewsSnapshot,
    () => [],
  );

  return useMemo(
    () => ({
      reviews,
      reviewsForTask: (taskId: string) =>
        reviews.filter((review) => review.taskId === taskId),
      submitReview,
      publishDue,
    }),
    [reviews],
  );
}
