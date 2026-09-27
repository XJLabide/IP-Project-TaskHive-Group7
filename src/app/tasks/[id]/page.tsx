import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bids, tasks } from "@/lib/sample-data";

// Reusable outline button styles
const outlineButtonStyles = "border-[#FFC800] text-zinc-900 dark:text-zinc-100 hover:border-[#D19300] hover:bg-[#FFD50D]/10 dark:hover:border-[#FFD50D] dark:hover:bg-[#FFC800]/10 hover:text-[#D19300] dark:hover:text-[#FFD50D] transition-colors";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = tasks.find((item) => item.id === id) ?? tasks[0];

  return (
    <AppShell title={task.title} description={`${task.category} task in ${task.location}.`}>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>{task.title}</CardTitle>
              <Badge>{task.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6">
            <p className="text-zinc-600 dark:text-zinc-300">{task.description}</p>
            <div className="grid gap-3 text-sm md:grid-cols-4">
              <div><span className="text-zinc-500 dark:text-zinc-400">Budget</span><strong className="block dark:text-zinc-100">PHP {task.budget}</strong></div>
              <div><span className="text-zinc-500 dark:text-zinc-400">Mode</span><strong className="block dark:text-zinc-100">{task.mode}</strong></div>
              <div><span className="text-zinc-500 dark:text-zinc-400">Distance</span><strong className="block dark:text-zinc-100">{task.distance}</strong></div>
              <div><span className="text-zinc-500 dark:text-zinc-400">Deadline</span><strong className="block dark:text-zinc-100">{task.deadline}</strong></div>
            </div>
            <div className="grid min-h-56 place-items-center rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 text-sm text-zinc-500 dark:text-zinc-400 transition-colors">
              Mapbox map placeholder
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Apply for this task</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button className="bg-[#FFC800] text-black hover:bg-[#D19300] font-semibold border-none shadow-sm transition-colors">
                Submit bid
              </Button>
              <Button variant="outline" className={outlineButtonStyles}>
                Request fixed-price task
              </Button>
              <Button variant="outline" className={outlineButtonStyles}>
                Chat with Poster
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Current bids</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {bids.map((bid) => (
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-3 text-sm transition-colors" key={bid.id}>
                  <strong className="dark:text-zinc-100">{bid.tasker}</strong>
                  <p className="mt-1 text-zinc-600 dark:text-zinc-400">PHP {bid.offer} · {bid.eta} · {bid.rating} rating</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}