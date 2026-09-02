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
    <div className="flex items-center justify-between gap-4 border-b border-zinc-100 py-3 last:border-b-0">
      <span className="text-sm text-zinc-700">{label}</span>
      <div className="flex items-center gap-2">
        <div className="flex" aria-label={`${value} out of 5`}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              className={
                index < value
                  ? "h-4 w-4 fill-zinc-950 text-zinc-950"
                  : "h-4 w-4 text-zinc-300"
              }
              key={index}
            />
          ))}
        </div>
        <span className="w-8 text-right text-sm font-medium">{value}.0</span>
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
            <p className="mt-2 text-sm text-zinc-600">{subtitle}</p>
          </div>
          <Badge>Unlocked</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm">
          <div>
            <span className="block text-zinc-500">Reviewer</span>
            <strong>{reviewer}</strong>
          </div>
          <ArrowRight className="h-4 w-4 text-zinc-500" />
          <div>
            <span className="block text-zinc-500">Review shown on</span>
            <strong>{reviewee}</strong>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 px-4">
          {items.map((item) => (
            <RatingRow key={item.label} label={item.label} value={item.value} />
          ))}
        </div>

        <label className="grid gap-2 text-sm font-medium">
          Public review
          <textarea
            className="min-h-28 rounded-lg border border-zinc-300 bg-white p-3 text-sm font-normal text-zinc-950 outline-none focus:border-zinc-500"
            defaultValue={placeholder}
          />
        </label>

        <Button>Submit review</Button>
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
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-zinc-100 text-sm font-semibold">
            {name
              .split(" ")
              .map((part) => part[0])
              .join("")}
          </div>
          <div>
            <strong>{name}</strong>
            <p className="text-sm text-zinc-600">{role}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1 font-semibold">
            <Star className="h-4 w-4 fill-zinc-950 text-zinc-950" />
            {rating}
          </div>
          <p className="text-sm text-zinc-500">{count}</p>
        </div>
      </div>
      <p className="mt-4 border-t border-zinc-100 pt-4 text-sm text-zinc-700">
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
              <CheckCircle2 className="h-5 w-5 text-zinc-900" />
              <div>
                <strong>Tasker marks complete</strong>
                <p className="text-sm text-zinc-600">The Tasker submits the task as finished.</p>
              </div>
            </div>
            <ArrowRight className="hidden h-4 w-4 text-zinc-400 md:block" />
            <div className="flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-zinc-900" />
              <div>
                <strong>Poster confirms</strong>
                <p className="text-sm text-zinc-600">Payment becomes ready for release.</p>
              </div>
            </div>
            <ArrowRight className="hidden h-4 w-4 text-zinc-400 md:block" />
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-zinc-900" />
              <div>
                <strong>Both reviews open</strong>
                <p className="text-sm text-zinc-600">Each role gets a separate reputation score.</p>
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
