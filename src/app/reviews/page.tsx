import { ArrowRight, CheckCircle2, Star, UserCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const posterReviewItems = [
  { label: "Work quality", value: 5 },
  { label: "Punctuality", value: 5 },
  { label: "Communication", value: 4 },
  { label: "Professionalism", value: 5 },
];

const taskerReviewItems = [
  { label: "Clear instructions", value: 5 },
  { label: "Fair treatment", value: 5 },
  { label: "Communication", value: 5 },
  { label: "Approval speed", value: 4 },
];

function RatingRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 py-3 last:border-b-0 transition-colors">
      <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
      <div className="flex items-center gap-2">
        <div className="flex" aria-label={`${value} out of 5`}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              className={
                index < value
                  ? "h-4 w-4 fill-[#FFC800] text-[#FFC800]"
                  : "h-4 w-4 text-zinc-300 dark:text-zinc-700"
              }
              key={index}
            />
          ))}
        </div>
        <span className="w-8 text-right text-sm font-medium dark:text-zinc-100">{value}.0</span>
      </div>
    </div>
  );
}

function ReviewCard({
  title,
  subtitle,
  reviewer,
  reviewee,
  items,
  placeholder,
}: {
  title: string;
  subtitle: string;
  reviewer: string;
  reviewee: string;
  items: Array<{ label: string; value: number }>;
  placeholder: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
          </div>
          <Badge>Unlocked</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4 text-sm transition-colors">
          <div>
            <span className="block text-zinc-500 dark:text-zinc-400">Reviewer</span>
            <strong className="dark:text-zinc-100">{reviewer}</strong>
          </div>
          <ArrowRight className="h-4 w-4 text-zinc-500 dark:text-zinc-600" />
          <div>
            <span className="block text-zinc-500 dark:text-zinc-400">Review shown on</span>
            <strong className="dark:text-zinc-100">{reviewee}</strong>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-4 transition-colors">
          {items.map((item) => (
            <RatingRow key={item.label} label={item.label} value={item.value} />
          ))}
        </div>

        <label className="grid gap-2 text-sm font-medium dark:text-zinc-200">
          Public review
          <textarea
            className="min-h-28 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 text-sm font-normal text-zinc-950 dark:text-zinc-50 outline-none focus:border-[#FFC800] dark:focus:border-[#FFC800] transition-colors"
            defaultValue={placeholder}
          />
        </label>

        <Button className="w-full bg-[#FFC800] text-black hover:bg-[#D19300] font-semibold border-none shadow-sm transition-colors">
          Submit review
        </Button>
      </CardContent>
    </Card>
  );
}

function ProfilePreview({
  name,
  role,
  rating,
  count,
  review,
}: {
  name: string;
  role: string;
  rating: string;
  count: string;
  review: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-sm font-semibold dark:text-zinc-200 transition-colors">
            {name
              .split(" ")
              .map((part) => part[0])
              .join("")}
          </div>
          <div>
            <strong className="dark:text-zinc-100">{name}</strong>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{role}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1 font-semibold dark:text-zinc-100">
            <Star className="h-4 w-4 fill-[#FFC800] text-[#FFC800]" />
            {rating}
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{count}</p>
        </div>
      </div>
      <p className="mt-4 border-t border-zinc-100 dark:border-zinc-800 pt-4 text-sm text-zinc-700 dark:text-zinc-300 transition-colors">
        {review}
      </p>
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <AppShell
      title="Two-Way Reviews"
      description="Reviews unlock only after task completion is confirmed, then both sides rate each other."
    >
      <div className="grid gap-6">
        <Card>
          <CardContent className="grid gap-4 pt-5 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-zinc-900 dark:text-[#FFC800]" />
              <div>
                <strong className="dark:text-zinc-100">Tasker marks complete</strong>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">The Tasker submits the task as finished.</p>
              </div>
            </div>
            <ArrowRight className="hidden h-4 w-4 text-zinc-400 dark:text-zinc-700 md:block" />
            <div className="flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-zinc-900 dark:text-[#FFC800]" />
              <div>
                <strong className="dark:text-zinc-100">Poster confirms</strong>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Payment becomes ready for release.</p>
              </div>
            </div>
            <ArrowRight className="hidden h-4 w-4 text-zinc-400 dark:text-zinc-700 md:block" />
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-zinc-900 dark:text-[#FFC800]" />
              <div>
                <strong className="dark:text-zinc-100">Both reviews open</strong>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Each role gets a separate reputation score.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <ReviewCard
            title="Poster Reviews Tasker"
            subtitle="This review affects the Tasker's public work profile."
            reviewer="Maria Santos, Poster"
            reviewee="Ana Reyes, Tasker"
            items={posterReviewItems}
            placeholder="Ana finished the grocery delivery on time, communicated clearly, and handled the receipt properly."
          />
          <ReviewCard
            title="Tasker Reviews Poster"
            subtitle="This review affects the Poster's trust profile."
            reviewer="Ana Reyes, Tasker"
            reviewee="Maria Santos, Poster"
            items={taskerReviewItems}
            placeholder="Maria gave complete instructions, approved the completed task quickly, and was easy to coordinate with."
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Result</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
            <ProfilePreview
              name="Ana Reyes"
              role="Tasker profile"
              rating="4.8"
              count="18 completed tasks"
              review="Reliable Tasker. Recent reviews mention punctual delivery, careful work, and clear updates."
            />
            <ProfilePreview
              name="Maria Santos"
              role="Poster profile"
              rating="4.9"
              count="12 posted tasks"
              review="Trusted Poster. Recent reviews mention clear task details, fair budgets, and fast confirmation."
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}