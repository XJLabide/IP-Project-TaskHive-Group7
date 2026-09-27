"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Clock, MapPin, Pencil, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMockTasks } from "@/lib/mock-task-store";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { tasks, ready, deleteTask } = useMockTasks();
  const task = tasks.find((item) => item.id === id);

  function handleDelete() {
    if (!task) return;
    if (window.confirm(`Delete “${task.title}”? This removes it from this browser session.`)) {
      deleteTask(task.id);
      router.push("/tasks");
    }
  }

  if (!ready) {
    return <AppShell title="Task details" description="Loading this browser session’s tasks."><p>Loading task…</p></AppShell>;
  }

  if (!task) {
    return (
      <AppShell title="Task not found" description="This task is not available in this browser session.">
        <Card><CardContent className="grid gap-4 p-6">
          <p>The task may have been deleted or this browser session may have been cleared.</p>
          <Button asChild className="w-fit"><Link href="/tasks">Back to Browse Tasks</Link></Button>
        </CardContent></Card>
      </AppShell>
    );
  }

  return (
    <AppShell title={task.title} description={`${task.category} task in ${task.location}.`}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-xl font-bold">{task.title}</CardTitle>
              <Badge>{task.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-[#FFC800]/40 bg-[#FFD50D]/25 text-zinc-800 dark:bg-[#FFC800]/15 dark:text-zinc-100">{task.category}</Badge>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">{task.mode}</span>
            </div>
            <p className="text-zinc-600 dark:text-zinc-300">{task.description}</p>
            <div className="grid gap-4 border-y border-zinc-100 py-5 text-sm dark:border-zinc-800 sm:grid-cols-2 lg:grid-cols-4">
              <div><span className="text-zinc-500 dark:text-zinc-400">Budget</span><strong className="mt-1 block">PHP {task.budget}</strong></div>
              <div><span className="text-zinc-500 dark:text-zinc-400">Distance</span><strong className="mt-1 block">{task.distance}</strong></div>
              <div><span className="text-zinc-500 dark:text-zinc-400">Location</span><strong className="mt-1 block">{task.location}</strong></div>
              <div><span className="text-zinc-500 dark:text-zinc-400">Deadline</span><strong className="mt-1 block">{task.deadline}</strong></div>
            </div>
            <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-900/50">
              <div>
                <MapPin className="mx-auto h-7 w-7 text-[#D19300] dark:text-[#FFD50D]" />
                <p className="mt-3 text-sm font-semibold">Map preview</p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Backend map data is not connected. The location is stored as text.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <aside className="grid content-start gap-5">
          <Card><CardContent className="grid gap-3 p-5">
            <h2 className="font-bold">Manage task</h2>
            <Button asChild><Link href={`/tasks/${task.id}/edit`}><Pencil className="h-4 w-4" /> Edit task</Link></Button>
            <Button onClick={handleDelete} type="button" variant="outline"><Trash2 className="h-4 w-4" /> Delete task</Button>
            <Button asChild variant="ghost"><Link href="/tasks">Back to Browse Tasks</Link></Button>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <p className="text-sm font-bold">Frontend demo</p>
            <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">This task lives in session storage only. Bids, chat, payment, and map services are not connected.</p>
            <p className="mt-4 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400"><Clock className="h-4 w-4" />{task.deadline}</p>
          </CardContent></Card>
        </aside>
      </div>
    </AppShell>
  );
}
