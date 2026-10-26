import { describe, expect, it } from "vitest";
import {
  applicationFormErrors,
  approvalFor,
  applicationsForTask,
  applicationsForTasker,
  applicationStatusLabel,
  invalidateApplications,
  submitApplication,
  withdrawApplication,
  type ApplicationFormValues,
  type DemoApplication,
} from "./demo";
import type { TaskSummary } from "@/lib/tasks/types";

const now = new Date("2026-10-26T10:00:00.000Z");

function task(overrides: Partial<TaskSummary> = {}): TaskSummary {
  return {
    id: "task_1",
    title: "Pick up groceries",
    description: "Buy groceries and deliver them nearby.",
    category: "Delivery",
    fulfillmentMode: "local",
    hiringMode: "bidding",
    status: "open",
    budget: 450,
    location: "Sampaloc, Manila",
    deadline: "2026-11-02T17:00:00+08:00",
    poster: "Maria Santos",
    applications: 0,
    ...overrides,
  };
}

function values(overrides: Partial<ApplicationFormValues> = {}): ApplicationFormValues {
  return { amount: "450", message: "I can deliver before 5 PM.", estimatedTime: "1 hour", ...overrides };
}

function application(overrides: Partial<DemoApplication> = {}): DemoApplication {
  return {
    id: "application_1",
    taskId: "task_1",
    tasker: "Ana Reyes",
    kind: "bid",
    status: "submitted",
    amountCents: 45000,
    message: "I can deliver before 5 PM.",
    estimatedTime: "1 hour",
    verification: "pending",
    createdAt: now.toISOString(),
    ...overrides,
  };
}

describe("application form", () => {
  it("requires a positive bid amount and a useful message", () => {
    expect(applicationFormErrors(values(), "bid")).toEqual({});
    expect(applicationFormErrors(values({ amount: "" }), "bid").amount).toBeDefined();
    expect(applicationFormErrors(values({ amount: "0" }), "bid").amount).toBeDefined();
    expect(applicationFormErrors(values({ message: "Hi" }), "bid").message).toBeDefined();
  });

  it("keeps the fixed-price message optional", () => {
    expect(applicationFormErrors({ amount: "", message: "", estimatedTime: "" }, "request")).toEqual({});
    expect(applicationFormErrors({ amount: "", message: "Hi", estimatedTime: "" }, "request").message).toBeDefined();
  });
});

describe("submitting an application", () => {
  const base = {
    applications: [] as DemoApplication[],
    task: task(),
    tasker: "Ana Reyes",
    verification: "pending" as const,
    values: values(),
    id: "application_new",
    now,
  };

  it("stores a bid on a bidding task", () => {
    const result = submitApplication(base);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applications[0]).toMatchObject({
      id: "application_new",
      taskId: "task_1",
      tasker: "Ana Reyes",
      kind: "bid",
      status: "submitted",
      amountCents: 45000,
      verification: "pending",
    });
    expect(result.applications[0].id).toBe("application_new");
    expect(result.applications[0].createdAt).toBe(now.toISOString());
  });

  it("stores a request at the listed price on a fixed-price task", () => {
    const result = submitApplication({
      ...base,
      task: task({ id: "task_fixed", hiringMode: "fixed_price", budget: 900 }),
      values: { amount: "", message: "Available tomorrow.", estimatedTime: "" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applications[0]).toMatchObject({
      kind: "request",
      amountCents: 90000,
    });
  });

  it("rejects the wrong form for the hiring mode by using the task mode", () => {
    const result = submitApplication({
      ...base,
      task: task({ hiringMode: "fixed_price", budget: 900 }),
      values: values({ message: "" }),
    });

    expect(result).toMatchObject({ ok: true });
  });

  it("rejects own tasks, closed tasks, and duplicates", () => {
    expect(submitApplication({ ...base, tasker: "Maria Santos" })).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/own task/i),
    });
    expect(submitApplication({ ...base, task: task({ status: "cancelled" }) })).toMatchObject({
      ok: false,
    });
    expect(
      submitApplication({ ...base, applications: [application()] }),
    ).toMatchObject({ ok: false, reason: expect.stringMatching(/already applied/i) });
  });

  it("replaces a withdrawn application when the Tasker applies again", () => {
    const result = submitApplication({
      ...base,
      applications: [application({ id: "application_old", status: "withdrawn" })],
      id: "application_new",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applications).toHaveLength(1);
    expect(result.applications[0]).toMatchObject({ id: "application_old", status: "submitted" });
  });
});

describe("withdrawing an application", () => {
  it("withdraws a submitted application while the task is open", () => {
    const result = withdrawApplication({
      applications: [application()],
      task: task(),
      tasker: "Ana Reyes",
      id: "application_1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applications[0].status).toBe("withdrawn");
  });

  it("refuses another Tasker and a closed task", () => {
    expect(
      withdrawApplication({
        applications: [application()],
        task: task(),
        tasker: "Lia Ramos",
        id: "application_1",
      }),
    ).toMatchObject({ ok: false });
    expect(
      withdrawApplication({
        applications: [application()],
        task: task({ status: "cancelled" }),
        tasker: "Ana Reyes",
        id: "application_1",
      }),
    ).toMatchObject({ ok: false });
  });
});

describe("application views", () => {
  it("marks pending-verification applications visible but not selectable", () => {
    expect(approvalFor(application({ verification: "pending" }), task())).toEqual({
      approvable: false,
      reason: expect.stringMatching(/verification/i),
    });
    expect(approvalFor(application({ verification: "verified" }), task())).toEqual({
      approvable: true,
      reason: null,
    });
  });

  it("lists applications by task and by Tasker, newest first", () => {
    const older = application({ id: "older", createdAt: "2026-10-25T10:00:00.000Z" });
    const newer = application({ id: "newer", createdAt: "2026-10-26T10:00:00.000Z" });

    expect(applicationsForTask([older, newer], "task_1").map((item) => item.id)).toEqual([
      "newer",
      "older",
    ]);
    expect(applicationsForTasker([older, newer], "Ana Reyes")).toHaveLength(2);
    expect(applicationsForTasker([older], "Lia Ramos")).toEqual([]);
  });

  it("labels every application status", () => {
    expect(applicationStatusLabel("submitted")).toBe("Applied");
    expect(applicationStatusLabel("accepted")).toBe("Selected");
    expect(applicationStatusLabel("withdrawn")).toBe("Withdrawn");
    expect(applicationStatusLabel("invalidated")).toBe("Reset by task change");
    expect(applicationStatusLabel("rejected")).toBe("Not selected");
  });

  it("invalidates live applications after a material task change", () => {
    const result = invalidateApplications(
      [application(), application({ id: "withdrawn", status: "withdrawn" })],
      "task_1",
    );

    expect(result[0].status).toBe("invalidated");
    expect(result[1].status).toBe("withdrawn");
  });
});
