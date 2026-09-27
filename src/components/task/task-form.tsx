"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, ReceiptText, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMockTasks, type NewTask, type Task } from "@/lib/mock-task-store";

const emptyTask: NewTask = {
  title: "",
  category: "Delivery",
  mode: "Bidding",
  budget: 0,
  location: "",
  deadline: "",
  description: "",
};

const inputClass = "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none placeholder:text-zinc-400 focus:border-[#D19300] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-[#FFD50D]";
const categories = ["Delivery", "Cleaning", "Tutoring", "Repairs", "Moving"];
const modes = [
  ["Bidding", "Compare offers before choosing."],
  ["Fixed price manual", "Review each request yourself."],
  ["Fixed price auto", "Assign the first valid request."],
] as const;

function formValues(task: Task): NewTask {
  return {
    title: task.title,
    category: task.category,
    mode: task.mode,
    budget: task.budget,
    location: task.location,
    deadline: task.deadline,
    description: task.description,
  };
}

export function TaskForm({ mode, taskId }: { mode: "create" | "edit"; taskId?: string }) {
  const { tasks, ready } = useMockTasks();
  const task = mode === "edit" ? tasks.find((item) => item.id === taskId) : undefined;
  const title = mode === "create" ? "Create Task" : "Edit Task";

  if (!ready) {
    return <AppShell title={title} description="Loading this browser session’s tasks."><p>Loading task form…</p></AppShell>;
  }

  if (mode === "edit" && !task) {
    return (
      <AppShell title="Task not found" description="This task is not available in this browser session.">
        <Card><CardContent className="grid gap-4 p-6">
          <p>The task may have been deleted or this browser session may have been cleared.</p>
          <Button asChild className="w-fit"><Link href="/tasks">Back to Browse Tasks</Link></Button>
        </CardContent></Card>
      </AppShell>
    );
  }

  return <TaskFormFields key={taskId ?? "new-task"} mode={mode} task={task} taskId={taskId} />;
}

function TaskFormFields({ mode, task, taskId }: { mode: "create" | "edit"; task?: Task; taskId?: string }) {
  const router = useRouter();
  const { createTask, updateTask } = useMockTasks();
  const [form, setForm] = useState<NewTask>(() => (task ? formValues(task) : emptyTask));
  const [error, setError] = useState("");

  function updateField<Key extends keyof NewTask>(key: Key, value: NewTask[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (form.title.trim().length < 3) return setError("Enter a title with at least 3 characters.");
    if (form.description.trim().length < 10) return setError("Add a description with at least 10 characters.");
    if (!Number.isFinite(form.budget) || form.budget <= 0) return setError("Enter a budget greater than zero.");
    if (form.location.trim().length < 2) return setError("Enter a task location.");
    if (!form.deadline.trim()) return setError("Enter a deadline.");

    const cleanForm = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      deadline: form.deadline.trim(),
    };

    if (mode === "create") {
      router.push(`/tasks/${createTask(cleanForm)}`);
      return;
    }

    if (taskId) {
      updateTask(taskId, cleanForm);
      router.push(`/tasks/${taskId}`);
    }
  }

  const fee = Math.round(form.budget * 0.05 * 100) / 100;
  const allCategories = [...new Set([...categories, form.category])];

  return (
    <AppShell title={mode === "create" ? "Create Task" : "Edit Task"} description={mode === "create" ? "Post a local task for people in your community." : "Update the details for this local task."}>
      <div className="mb-6 flex items-center gap-3 text-sm">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#FFC800] font-bold text-zinc-950">1</span>
        <strong>{mode === "create" ? "Task details" : "Edit task"}</strong>
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        <span className="text-zinc-400">{mode === "create" ? "Review & publish" : "Save changes"}</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card><CardContent className="p-5 sm:p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#D19300] dark:text-[#FFD50D]">{mode === "create" ? "New local task" : "Local task"}</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">{mode === "create" ? "Tell Taskers what you need" : "Update task details"}</h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Changes are saved in this browser session only.</p>
          </div>

          <form className="mt-8 grid gap-7" noValidate onSubmit={handleSubmit}>
            <fieldset className="grid gap-4">
              <legend className="mb-1 text-sm font-bold">The essentials</legend>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold">Task title
                  <input autoComplete="off" className={inputClass} maxLength={100} onChange={(event) => updateField("title", event.target.value)} placeholder="Pick up groceries" required value={form.title} />
                </label>
                <label className="grid gap-2 text-sm font-semibold">Category
                  <select className={inputClass} onChange={(event) => updateField("category", event.target.value)} value={form.category}>
                    {allCategories.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold">Budget (PHP)
                  <input className={inputClass} min="1" onChange={(event) => updateField("budget", Number(event.target.value))} placeholder="450" required type="number" value={form.budget || ""} />
                </label>
                <label className="grid gap-2 text-sm font-semibold">Deadline
                  <input className={inputClass} onChange={(event) => updateField("deadline", event.target.value)} placeholder="Today, 5:00 PM" required value={form.deadline} />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-semibold">Location
                <span className={`${inputClass} flex items-center gap-2 text-zinc-400`}>
                  <MapPin className="h-4 w-4 text-[#D19300] dark:text-[#FFD50D]" />
                  <input className="min-w-0 flex-1 bg-transparent outline-none" onChange={(event) => updateField("location", event.target.value)} placeholder="Neighborhood or pickup area" required value={form.location} />
                </span>
              </label>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-bold">How would you like to hire?</legend>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Choose the process that suits this task.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {modes.map(([item, detail]) => (
                  <label className={`cursor-pointer rounded-xl border p-4 transition-colors ${form.mode === item ? "border-[#FFC800] bg-[#FFD50D]/15 dark:bg-[#FFC800]/10" : "border-zinc-200 hover:border-[#D19300] dark:border-zinc-700 dark:hover:border-[#FFD50D]"}`} key={item}>
                    <input checked={form.mode === item} className="sr-only" name="mode" onChange={() => updateField("mode", item)} type="radio" value={item} />
                    <strong className="text-sm">{item}</strong><span className="mt-2 block text-xs leading-5 text-zinc-500 dark:text-zinc-400">{detail}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="grid gap-2 text-sm font-semibold">Description
              <textarea className="min-h-36 rounded-xl border border-zinc-200 bg-white p-3 text-sm font-normal outline-none placeholder:text-zinc-400 focus:border-[#D19300] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-[#FFD50D]" maxLength={2000} onChange={(event) => updateField("description", event.target.value)} placeholder="Describe the task, pickup/drop-off details, and anything the Tasker should know." required value={form.description} />
            </label>

            {error && <p className="text-sm text-red-700 dark:text-red-400" role="alert">{error}</p>}
            <div className="flex flex-wrap justify-end gap-3 border-t border-zinc-100 pt-5 dark:border-zinc-800">
              <Button asChild variant="outline"><Link href={mode === "edit" && taskId ? `/tasks/${taskId}` : "/tasks"}>Cancel</Link></Button>
              <Button type="submit">{mode === "create" ? "Publish task" : "Save changes"}</Button>
            </div>
          </form>
        </CardContent></Card>

        <aside className="grid content-start gap-5">
          <Card><CardContent className="p-5">
            <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#D19300] dark:text-[#FFD50D]" /><h2 className="font-bold">Before publishing</h2></div>
            <div className="mt-5 grid gap-4 text-sm text-zinc-600 dark:text-zinc-400">
              <p className="flex gap-3"><CalendarDays className="h-4 w-4 shrink-0 text-[#D19300] dark:text-[#FFD50D]" />Clear deadlines help Taskers decide if they can commit.</p>
              <p className="flex gap-3"><ReceiptText className="h-4 w-4 shrink-0 text-[#D19300] dark:text-[#FFD50D]" />Backend payment is not connected; these tasks are demo data only.</p>
            </div>
          </CardContent></Card>
          <Card><CardContent className="p-5">
            <p className="text-sm font-bold">Payment estimate</p>
            <div className="mt-4 grid gap-3 text-sm">
              <p className="flex justify-between text-zinc-500 dark:text-zinc-400"><span>Task budget</span><strong className="text-zinc-950 dark:text-zinc-100">PHP {form.budget.toFixed(2)}</strong></p>
              <p className="flex justify-between text-zinc-500 dark:text-zinc-400"><span>Platform fee (5%)</span><strong className="text-zinc-950 dark:text-zinc-100">PHP {fee.toFixed(2)}</strong></p>
              <p className="flex justify-between border-t border-zinc-100 pt-3 font-bold dark:border-zinc-800"><span>Estimate</span><span>PHP {(form.budget + fee).toFixed(2)}</span></p>
            </div>
          </CardContent></Card>
        </aside>
      </div>
    </AppShell>
  );
}
