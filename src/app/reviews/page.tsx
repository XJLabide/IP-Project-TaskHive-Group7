import Link from "next/link";
import { headers } from "next/headers";
import { EyeOff, LockKeyhole, Star } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { ReviewForm } from "@/components/reviews/review-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { loadActorFromHeaders } from "@/lib/auth/actor";
import { guardPage } from "@/lib/auth/guard";
import { formatChatTime } from "@/lib/chat/demo";
import { getReviewOverview } from "@/lib/completion/service";

export const runtime = "nodejs";

function formatDate(value: Date | null): string {
  return value ? formatChatTime(value.toISOString()) : "when the window closes";
}

function Stars({ rating }: { rating: number }) {
  return (
    <span
      aria-label={`${rating} out of 5`}
      className="flex items-center gap-0.5"
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          aria-hidden="true"
          className={
            index < rating
              ? "h-4 w-4 fill-[#FFC800] text-[#FFC800]"
              : "h-4 w-4 text-zinc-200 dark:text-zinc-700"
          }
          key={index}
        />
      ))}
    </span>
  );
}

export default async function ReviewsPage() {
  await guardPage("view_private_account");
  const actor = await loadActorFromHeaders(await headers());

  if (!actor) {
    return (
      <AppShell
        description="Reviews unlock after task completion is confirmed."
        title="Two-Way Reviews"
      >
        <Card>
          <CardContent className="grid gap-3 p-5 sm:p-6">
            <p className="font-bold">Sign in to see your reviews</p>
            <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              Reviews are private until both participants submit or the 14-day window
              passes.
            </p>
            <Button asChild className="w-fit" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const overview = await getReviewOverview(actor.id);
  const isEmpty =
    overview.opportunities.length === 0 &&
    overview.waiting.length === 0 &&
    overview.received.length === 0;

  return (
    <AppShell
      description="Blind reviews from completed tasks. Nothing here is sample data."
      title="Two-Way Reviews"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-6">
          {overview.opportunities.length > 0 ? (
            <section aria-labelledby="review-ready-title" className="grid gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#D19300] dark:text-[#FFD50D]">
                  Review ready
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight" id="review-ready-title">
                  Completed tasks waiting for your review
                </h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Each side reviews once. Both reviews publish together, or after the
                  14-day window.
                </p>
              </div>

              {overview.opportunities.map((opportunity) => (
                <Card key={opportunity.taskId}>
                  <CardContent className="grid gap-4 p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold tracking-tight">
                          {opportunity.taskTitle}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          Publishes with both reviews or on{" "}
                          {formatDate(opportunity.publishAt)}.
                        </p>
                      </div>
                      <Badge className="border-[#FFC800]/40 bg-[#FFD50D]/20 dark:bg-[#FFC800]/15">
                        Unlocked
                      </Badge>
                    </div>

                    <ReviewForm
                      counterpart={opportunity.counterpart}
                      role={opportunity.role}
                      taskId={opportunity.taskId}
                    />
                  </CardContent>
                </Card>
              ))}
            </section>
          ) : null}

          {overview.waiting.length > 0 ? (
            <section aria-labelledby="review-waiting-title" className="grid gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#D19300] dark:text-[#FFD50D]">
                  Hidden
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight" id="review-waiting-title">
                  Your submitted reviews
                </h2>
              </div>

              {overview.waiting.map((item) => (
                <Card key={item.taskId}>
                  <CardContent className="flex flex-wrap items-start justify-between gap-3 p-5">
                    <div className="min-w-0">
                      <p className="font-bold">{item.taskTitle}</p>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Waiting for {item.counterpart}. Publishes with both reviews or
                        on {formatDate(item.publishAt)}.
                      </p>
                    </div>
                    <Badge>
                      <LockKeyhole className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                      Hidden
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </section>
          ) : null}

          {overview.received.length > 0 ? (
            <section aria-labelledby="review-received-title" className="grid gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#D19300] dark:text-[#FFD50D]">
                  Published
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-tight" id="review-received-title">
                  Reviews about you
                </h2>
              </div>

              {overview.received.map((review) => (
                <Card key={review.id}>
                  <CardContent className="grid gap-3 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold">{review.reviewer}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {review.taskTitle}
                          {review.publishedAt
                            ? ` · ${formatChatTime(review.publishedAt.toISOString())}`
                            : ""}
                        </p>
                      </div>
                      <Stars rating={review.rating} />
                    </div>
                    {review.comment ? (
                      <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                        {review.comment}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </section>
          ) : null}

          {isEmpty ? (
            <Card>
              <CardContent className="grid gap-3 p-6">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#FFD50D]/25 text-[#D19300] dark:bg-[#FFC800]/15 dark:text-[#FFD50D]">
                  <EyeOff className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="text-lg font-bold">No reviews yet</h2>
                <p className="max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                  Reviews appear after a task is completed and its payout is released.
                  Both participants review once, and both reviews stay hidden until
                  they are both in or 14 days pass.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link href="/dashboard">Back to dashboard</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/tasks">Browse tasks</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="grid content-start gap-4">
          <Card>
            <CardContent className="grid gap-3 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#D19300] dark:text-[#FFD50D]">
                Your public rating
              </p>
              {overview.averageRating === null ? (
                <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                  No published reviews yet. Your first review appears after both
                  participants submit or the 14-day window closes.
                </p>
              ) : (
                <div>
                  <p className="flex items-center gap-2 text-3xl font-bold">
                    <Star
                      aria-hidden="true"
                      className="h-5 w-5 fill-[#FFC800] text-[#FFC800]"
                    />
                    {overview.averageRating.toFixed(1)}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    From {overview.received.length} published review
                    {overview.received.length === 1 ? "" : "s"}.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-2 p-5 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              <p className="font-bold text-zinc-950 dark:text-zinc-50">
                How the blind window works
              </p>
              <p>
                Your review is saved as soon as you submit it, but stays hidden. It
                publishes when the other participant submits theirs, or automatically
                14 days after completion.
              </p>
              <p>
                Disputes freeze the payout, so reviews stay locked until the dispute is
                resolved.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
