"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Globe2,
  MapPin,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { AddressAutocomplete } from "@/components/task/address-autocomplete";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  LeafletLocationPicker,
  PHILIPPINES_MAP_CENTER,
} from "@/components/task/leaflet-location-picker";
import { useMockTasks, type Task } from "@/lib/mock-task-store";
import { useMarketplace } from "@/lib/mock-marketplace-store";
import { useViewer } from "@/components/viewer/viewer-provider";
import type { FulfillmentMode, HiringMode } from "@/lib/tasks/policy";
import type { Coordinates } from "@/lib/tasks/location";
import {
  categoryOptions,
  emptyTaskForm,
  materialEditNotice,
  taskFieldLabels,
  taskFormErrors,
  toTaskFields,
  toTaskFormValues,
  type TaskFormValues,
} from "@/lib/tasks/ui";
import type { TaskFieldErrors } from "@/lib/tasks/validation";

const inputClass = "h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none placeholder:text-zinc-400 focus:border-[#D19300] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-[#FFD50D]";

const fulfillmentOptions: Array<{
  value: FulfillmentMode;
  label: string;
  detail: string;
  icon: typeof MapPin;
}> = [
  {
    value: "local",
    label: "Local",
    detail: "The Tasker travels to a service location.",
    icon: MapPin,
  },
  {
    value: "remote",
    label: "Remote",
    detail: "The work is completed online.",
    icon: Globe2,
  },
];

const hiringOptions: Array<{
  value: HiringMode;
  label: string;
  detail: string;
}> = [
  {
    value: "bidding",
    label: "Bidding",
    detail: "Taskers send offers and you choose one.",
  },
  {
    value: "fixed_price",
    label: "Fixed price",
    detail: "Taskers request the price you set.",
  },
];

export function TaskForm({ mode, taskId }: { mode: "create" | "edit"; taskId?: string }) {
  const { tasks, ready } = useMockTasks();
  const task = mode === "edit" ? tasks.find((item) => item.id === taskId) : undefined;
  const title = mode === "create" ? "Create Task" : "Edit Task";

  if (!ready) {
    return (
      <AppShell title={title} description="Loading this browser session’s tasks.">
        <p>Loading task form…</p>
      </AppShell>
    );
  }

  if (mode === "edit" && !task) {
    return (
      <AppShell title="Task not found" description="This task is not available in this browser session.">
        <Card>
          <CardContent className="grid gap-4 p-6">
            <p>The task may have been deleted or this browser session may have been cleared.</p>
            <Button asChild className="w-fit">
              <Link href="/tasks">Back to Browse Tasks</Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  if (mode === "edit" && task?.status === "cancelled") {
    return (
      <AppShell title="Task cancelled" description="Cancelled tasks are retained in history.">
        <Card>
          <CardContent className="grid gap-4 p-6">
            <p>Cancelled tasks cannot be edited. Their applications and history stay available.</p>
            <Button asChild className="w-fit">
              <Link href={`/tasks/${task.id}`}>View task history</Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <TaskFormFields
      key={taskId ?? "new-task"}
      mode={mode}
      task={task}
      taskId={taskId}
    />
  );
}

function TaskFormFields({
  mode,
  task,
  taskId,
}: {
  mode: "create" | "edit";
  task?: Task;
  taskId?: string;
}) {
  const router = useRouter();
  const { viewer } = useViewer();
  const { createTask, updateTask } = useMockTasks();
  const { invalidateForTask } = useMarketplace();
  const [form, setForm] = useState<TaskFormValues>(() =>
    task ? toTaskFormValues(task) : emptyTaskForm(),
  );
  const [errors, setErrors] = useState<TaskFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const isOpen = task?.status === "open";
  const isDraft = task?.status === "draft" || !task;
  const applications = task?.applications ?? 0;

  const materialNotice = useMemo(
    () =>
      task && isOpen ? materialEditNotice(task, form, applications) : null,
    [applications, form, isOpen, task],
  );

  const categories = categoryOptions(form.fulfillmentMode);

  function updateField<Key extends keyof TaskFormValues>(
    key: Key,
    value: TaskFormValues[Key],
  ) {
    setForm((current) => {
      const next = { ...current, [key]: value };

      if (key === "fulfillmentMode") {
        const fulfillment = value as FulfillmentMode;
        const available = categoryOptions(fulfillment);
        if (!available.some((category) => category.label === current.category)) {
          next.category = available[0]?.label ?? "";
        }
        if (fulfillment === "remote") {
          next.location = "";
          next.address = "";
          next.latitude = null;
          next.longitude = null;
        }
      }

      return next;
    });
  }

  function selectTaskLocation(coordinates: Coordinates) {
    setForm((current) => ({
      ...current,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    }));
    setErrors((current) => ({ ...current, latitude: undefined, longitude: undefined }));
  }

  function save(publish: boolean) {
    setFormError("");
    setErrors({});

    const nextErrors = taskFormErrors(form, { publish });
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (!publish && materialNotice) {
      const confirmed = window.confirm(
        `${materialNotice.message}\n\nSave this change anyway?`,
      );
      if (!confirmed) return;
    }

    setSaving(true);
    const result =
      mode === "edit" && taskId
        ? updateTask(taskId, toTaskFields(form), { publish })
        : createTask(toTaskFields(form), publish, {
            poster: viewer.displayName ?? "You",
          });

    if (!result.ok) {
      setSaving(false);
      if (result.errors) setErrors(result.errors);
      else setFormError(result.reason ?? "Could not save the task.");
      return;
    }

    const cleared = result.clearedApplications ?? 0;
    if (mode === "edit" && taskId && cleared > 0) {
      invalidateForTask(taskId);
    }
    const notice = publish
      ? "Task published."
      : mode === "edit"
        ? "Task changes saved."
        : "Draft saved.";
    const params = new URLSearchParams({
      notice,
      ...(cleared > 0 ? { cleared: String(cleared) } : {}),
    });

    router.push(`/tasks/${result.taskId}?${params.toString()}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save(false);
  }

  const fee = Math.round((Number(form.budget) || 0) * 0.05 * 100) / 100;
  const errorList = Object.entries(errors) as Array<[keyof TaskFieldErrors, string]>;

  return (
    <AppShell
      title={mode === "create" ? "Create Task" : "Edit Task"}
      description={
        mode === "create"
          ? "Post a local or remote task for people in your community."
          : "Update the details for this task."
      }
    >
      <div className="mb-6 flex items-center gap-3 text-sm">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#FFC800] font-bold text-zinc-950">1</span>
        <strong>{mode === "create" ? "Task details" : isDraft ? "Edit draft" : "Edit published task"}</strong>
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        <span className="text-zinc-400">
          {mode === "create" || isDraft ? "Save draft or publish" : "Save changes"}
        </span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardContent className="p-5 sm:p-7">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#D19300] dark:text-[#FFD50D]">
                {form.fulfillmentMode === "local" ? "Local task" : "Remote task"}
                {isDraft && mode === "edit" ? " · Draft" : ""}
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">
                {mode === "create" ? "Tell Taskers what you need" : "Update task details"}
              </h2>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Changes are saved in this browser session only.
              </p>
            </div>

            {isOpen ? (
              <p className="mt-5 rounded-xl border border-[#FFC800]/40 bg-[#FFD50D]/15 p-3 text-sm leading-6 text-zinc-700 dark:bg-[#FFC800]/10 dark:text-zinc-300">
                This task is published. Changing a material detail resets pending
                applications and notifies those Taskers.
              </p>
            ) : null}

            <form className="mt-8 grid gap-7" noValidate onSubmit={handleSubmit}>
              <fieldset>
                <legend className="text-sm font-bold">How will this work be done?</legend>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Fulfillment and hiring are separate choices.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {fulfillmentOptions.map((option) => {
                    const Icon = option.icon;
                    const selected = form.fulfillmentMode === option.value;
                    return (
                      <label
                        className={`cursor-pointer rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-[#FFD50D] ${selected ? "border-[#FFC800] bg-[#FFD50D]/15 dark:bg-[#FFC800]/10" : "border-zinc-200 hover:border-[#D19300] dark:border-zinc-700 dark:hover:border-[#FFD50D]"}`}
                        key={option.value}
                      >
                        <input
                          checked={selected}
                          className="sr-only"
                          name="fulfillmentMode"
                          onChange={() => updateField("fulfillmentMode", option.value)}
                          type="radio"
                          value={option.value}
                        />
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          <Icon className="h-4 w-4 text-[#D19300] dark:text-[#FFD50D]" />
                          {option.label}
                        </span>
                        <span className="mt-2 block text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                          {option.detail}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-sm font-bold">How would you like to hire?</legend>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {hiringOptions.map((option) => {
                    const selected = form.hiringMode === option.value;
                    return (
                      <label
                        className={`cursor-pointer rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-[#FFD50D] ${selected ? "border-[#FFC800] bg-[#FFD50D]/15 dark:bg-[#FFC800]/10" : "border-zinc-200 hover:border-[#D19300] dark:border-zinc-700 dark:hover:border-[#FFD50D]"}`}
                        key={option.value}
                      >
                        <input
                          checked={selected}
                          className="sr-only"
                          name="hiringMode"
                          onChange={() => updateField("hiringMode", option.value)}
                          type="radio"
                          value={option.value}
                        />
                        <strong className="text-sm">{option.label}</strong>
                        <span className="mt-2 block text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                          {option.detail}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="grid gap-4">
                <legend className="mb-1 text-sm font-bold">The essentials</legend>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold">
                    Task title
                    <input
                      aria-describedby={errors.title ? "task-title-error" : undefined}
                      aria-invalid={errors.title ? true : undefined}
                      autoComplete="off"
                      className={inputClass}
                      maxLength={100}
                      onChange={(event) => updateField("title", event.target.value)}
                      placeholder="Pick up groceries"
                      value={form.title}
                    />
                    {errors.title ? <FieldError id="task-title-error" message={errors.title} /> : null}
                  </label>
                  <label className="grid gap-2 text-sm font-semibold">
                    Category
                    <select
                      aria-describedby={errors.category ? "task-category-error" : undefined}
                      aria-invalid={errors.category ? true : undefined}
                      className={inputClass}
                      onChange={(event) => updateField("category", event.target.value)}
                      value={form.category}
                    >
                      <option value="">Choose a category</option>
                      {categories.map((category) => (
                        <option key={category.label}>{category.label}</option>
                      ))}
                    </select>
                    {errors.category ? <FieldError id="task-category-error" message={errors.category} /> : null}
                  </label>
                  <label className="grid gap-2 text-sm font-semibold">
                    {form.hiringMode === "bidding" ? "Budget (PHP)" : "Price (PHP)"}
                    <input
                      aria-describedby={errors.budgetCents ? "task-budget-error" : undefined}
                      aria-invalid={errors.budgetCents ? true : undefined}
                      className={inputClass}
                      inputMode="decimal"
                      min="0"
                      onChange={(event) => updateField("budget", event.target.value)}
                      placeholder="450"
                      step="0.01"
                      type="number"
                      value={form.budget}
                    />
                    {errors.budgetCents ? <FieldError id="task-budget-error" message={errors.budgetCents} /> : null}
                  </label>
                  <label className="grid gap-2 text-sm font-semibold">
                    Deadline {isDraft ? "(required to publish, Philippines time)" : "(Philippines time)"}
                    <input
                      aria-describedby={errors.deadline ? "task-deadline-error" : undefined}
                      aria-invalid={errors.deadline ? true : undefined}
                      className={inputClass}
                      onChange={(event) => updateField("deadline", event.target.value)}
                      type="datetime-local"
                      value={form.deadline}
                    />
                    {errors.deadline ? <FieldError id="task-deadline-error" message={errors.deadline} /> : null}
                  </label>
                </div>

                {form.fulfillmentMode === "local" ? (
                  <>
                    <label className="grid gap-2 text-sm font-semibold">
                      Approximate area
                      <span className={`${inputClass} flex items-center gap-2 text-zinc-400`}>
                        <MapPin className="h-4 w-4 text-[#D19300] dark:text-[#FFD50D]" />
                        <input
                          aria-describedby={
                            errors.locationLabel ? "task-location-error" : "task-location-help"
                          }
                          aria-invalid={errors.locationLabel ? true : undefined}
                          className="min-w-0 flex-1 bg-transparent text-zinc-950 outline-none dark:text-zinc-100"
                          onChange={(event) => updateField("location", event.target.value)}
                          placeholder="Neighborhood or pickup area"
                          value={form.location}
                        />
                      </span>
                      {errors.locationLabel ? (
                        <FieldError id="task-location-error" message={errors.locationLabel} />
                      ) : (
                        <span
                          className="text-xs font-normal text-zinc-500 dark:text-zinc-400"
                          id="task-location-help"
                        >
                          Taskers see this before hire. Share the exact address after hiring.
                        </span>
                      )}
                    </label>
                    <div className="grid gap-2">
                      <p className="text-sm font-semibold" id="task-map-label">
                        Approximate service point
                      </p>
                      <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        Pin the general area. Do not place the exact address on this public map.
                      </p>
                      <LeafletLocationPicker
                        center={
                          form.latitude !== null && form.longitude !== null
                            ? { latitude: form.latitude, longitude: form.longitude }
                            : PHILIPPINES_MAP_CENTER
                        }
                        label="Choose the approximate task service point"
                        onSelect={selectTaskLocation}
                        selected={
                          form.latitude !== null && form.longitude !== null
                            ? { latitude: form.latitude, longitude: form.longitude }
                            : null
                        }
                        zoom={form.latitude !== null && form.longitude !== null ? 14 : 6}
                      />
                      {errors.latitude ? (
                        <FieldError id="task-map-error" message={errors.latitude} />
                      ) : null}
                    </div>
                    <div className="grid gap-2 text-sm font-semibold">
                      <label htmlFor="task-exact-address">Exact address</label>
                      <AddressAutocomplete
                        describedBy={
                          errors.addressLine ? "task-address-error" : "task-address-help"
                        }
                        invalid={Boolean(errors.addressLine)}
                        onChange={(value) => updateField("address", value)}
                        value={form.address}
                      />
                      {errors.addressLine ? (
                        <FieldError id="task-address-error" message={errors.addressLine} />
                      ) : (
                        <span
                          className="text-xs font-normal text-zinc-500 dark:text-zinc-400"
                          id="task-address-help"
                        >
                          Hidden from other users until payment succeeds and the assignment is active. Address searches go to Photon, which uses OpenStreetMap data.
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="flex gap-3 rounded-xl bg-zinc-50 p-3 text-sm leading-6 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
                    <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-[#D19300] dark:text-[#FFD50D]" />
                    Remote tasks are completed online, so no service location is needed.
                  </p>
                )}
              </fieldset>

              <label className="grid gap-2 text-sm font-semibold">
                Description
                <textarea
                  aria-describedby={
                    errors.description ? "task-description-error" : undefined
                  }
                  aria-invalid={errors.description ? true : undefined}
                  className="min-h-36 rounded-xl border border-zinc-200 bg-white p-3 text-sm font-normal outline-none placeholder:text-zinc-400 focus:border-[#D19300] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-[#FFD50D]"
                  maxLength={2000}
                  onChange={(event) => updateField("description", event.target.value)}
                  placeholder="Describe the task, deliverables, and anything the Tasker should know."
                  value={form.description}
                />
                {errors.description ? (
                  <FieldError id="task-description-error" message={errors.description} />
                ) : null}
              </label>

              {materialNotice ? (
                <div className="rounded-xl border border-[#FFC800]/50 bg-[#FFD50D]/15 p-4 text-sm leading-6 text-zinc-700 dark:bg-[#FFC800]/10 dark:text-zinc-300">
                  <p className="flex items-center gap-2 font-semibold">
                    <ShieldCheck className="h-4 w-4 text-[#D19300] dark:text-[#FFD50D]" />
                    This edit resets applications
                  </p>
                  <p className="mt-2">{materialNotice.message}</p>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    You will be asked to confirm before saving.
                  </p>
                </div>
              ) : null}

              {errorList.length > 0 ? (
                <div
                  className="rounded-lg border border-[#F04452]/40 bg-[#F04452]/10 p-3 text-sm text-[#a01a26] dark:text-[#F04452]"
                  role="alert"
                >
                  <p className="font-semibold">Check these details:</p>
                  <ul className="mt-1 list-inside list-disc">
                    {errorList.map(([field, message]) => (
                      <li key={field}>
                        {taskFieldLabels[field]}: {message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {formError ? (
                <p className="text-sm font-semibold text-[#a01a26] dark:text-[#F04452]" role="alert">
                  {formError}
                </p>
              ) : null}

              <div className="flex flex-wrap justify-end gap-3 border-t border-zinc-100 pt-5 dark:border-zinc-800">
                <Button asChild variant="outline">
                  <Link href={mode === "edit" && taskId ? `/tasks/${taskId}` : "/tasks"}>
                    Cancel
                  </Link>
                </Button>
                <Button disabled={saving} type="submit" variant={isDraft ? "outline" : "default"}>
                  {isDraft ? "Save draft" : "Save changes"}
                </Button>
                {isDraft ? (
                  <Button disabled={saving} onClick={() => save(true)} type="button">
                    {saving ? "Saving…" : "Publish task"}
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <aside className="grid content-start gap-5">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#D19300] dark:text-[#FFD50D]" />
                <h2 className="font-bold">Before publishing</h2>
              </div>
              <div className="mt-5 grid gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                <p className="flex gap-3">
                  <CalendarDays className="h-4 w-4 shrink-0 text-[#D19300] dark:text-[#FFD50D]" />
                  Clear deadlines help Taskers decide if they can commit.
                </p>
                <p className="flex gap-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#D19300] dark:text-[#FFD50D]" />
                  Only launch-approved categories are available. High-risk work is excluded.
                </p>
                <p className="flex gap-3">
                  <ReceiptText className="h-4 w-4 shrink-0 text-[#D19300] dark:text-[#FFD50D]" />
                  Payments and payouts are not connected yet; tasks on this page are saved only in this browser session.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm font-bold">Payment estimate</p>
              <div className="mt-4 grid gap-3 text-sm">
                <p className="flex justify-between text-zinc-500 dark:text-zinc-400">
                  <span>{form.hiringMode === "bidding" ? "Task budget" : "Task price"}</span>
                  <strong className="text-zinc-950 dark:text-zinc-100">
                    PHP {(Number(form.budget) || 0).toFixed(2)}
                  </strong>
                </p>
                <p className="flex justify-between text-zinc-500 dark:text-zinc-400">
                  <span>Platform fee (5%)</span>
                  <strong className="text-zinc-950 dark:text-zinc-100">
                    PHP {fee.toFixed(2)}
                  </strong>
                </p>
                <p className="flex justify-between border-t border-zinc-100 pt-3 font-bold dark:border-zinc-800">
                  <span>Estimate</span>
                  <span>PHP {((Number(form.budget) || 0) + fee).toFixed(2)}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <span
      className="text-xs font-medium text-[#a01a26] dark:text-[#F04452]"
      id={id}
    >
      {message}
    </span>
  );
}
