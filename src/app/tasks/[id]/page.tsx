import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { bids, tasks } from "@/lib/sample-data";

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
            <p className="text-zinc-600">{task.description}</p>
            <div className="grid gap-3 text-sm md:grid-cols-4">
              <div><span className="text-zinc-500">Budget</span><strong className="block">PHP {task.budget}</strong></div>
              <div><span className="text-zinc-500">Mode</span><strong className="block">{task.mode}</strong></div>
              <div><span className="text-zinc-500">Distance</span><strong className="block">{task.distance}</strong></div>
              <div><span className="text-zinc-500">Deadline</span><strong className="block">{task.deadline}</strong></div>
            </div>
            <div className="grid min-h-56 place-items-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-500">
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
              <Button>Submit bid</Button>
              <Button variant="outline">Request fixed-price task</Button>
              <Button variant="outline">Chat with Poster</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Current bids</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {bids.map((bid) => (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm" key={bid.id}>
                  <strong>{bid.tasker}</strong>
                  <p className="mt-1 text-zinc-600">PHP {bid.offer} · {bid.eta} · {bid.rating} rating</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
