import type { TaskerVerificationStatus } from "@/lib/domain/access";
import { budgetToCents } from "@/lib/tasks/ui";
import type { TaskSummary } from "@/lib/tasks/types";
import {
  canApply,
  canApprove,
  canWithdraw,
  isLiveApplicationStatus,
  kindForHiringMode,
  type ApplicationKind,
  type ApplicationStatus,
} from "./rules";

/** One demo application, stored per browser session. Identity is the demo name. */
export type DemoApplication = {
  id: string;
  taskId: string;
  tasker: string;
  kind: ApplicationKind;
  status: ApplicationStatus;
  amountCents: number | null;
  message: string | null;
  estimatedTime: string | null;
  verification: TaskerVerificationStatus;
  createdAt: string;
};

export type ApplicationFormValues = {
  amount: string;
  message: string;
  estimatedTime: string;
};

export type ApplicationFormErrors = {
  amount?: string;
  message?: string;
};

const statusLabels: Record<ApplicationStatus, string> = {
  submitted: "Applied",
  accepted: "Selected",
  withdrawn: "Withdrawn",
  invalidated: "Reset by task change",
  rejected: "Not selected",
};

export function applicationStatusLabel(status: ApplicationStatus): string {
  return statusLabels[status];
}

export function kindForTask(task: TaskSummary): ApplicationKind {
  return kindForHiringMode(task.hiringMode);
}

function parseAmount(value: string): number {
  return budgetToCents(value);
}

/** Field errors for the bid or fixed-price request form. */
export function applicationFormErrors(
  values: ApplicationFormValues,
  kind: ApplicationKind,
): ApplicationFormErrors {
  const errors: ApplicationFormErrors = {};
  const message = values.message.trim();

  if (kind === "bid") {
    const amountCents = parseAmount(values.amount);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      errors.amount = "Enter a bid greater than zero.";
    }
    if (message.length < 5) {
      errors.message = "Add a short message for the Poster.";
    }
  } else if (message.length > 0 && message.length < 5) {
    errors.message = "Add at least five characters, or leave the note empty.";
  }

  return errors;
}

export type ApplicationResult =
  | { ok: true; applications: DemoApplication[]; application: DemoApplication }
  | { ok: false; reason?: string; errors?: ApplicationFormErrors };

export function submitApplication(input: {
  applications: readonly DemoApplication[];
  task: TaskSummary;
  tasker: string;
  verification: TaskerVerificationStatus;
  values: ApplicationFormValues;
  id: string;
  now?: Date;
}): ApplicationResult {
  const now = input.now ?? new Date();
  const kind = kindForTask(input.task);
  const errors = applicationFormErrors(input.values, kind);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const existing = input.applications.filter(
    (application) =>
      application.taskId === input.task.id && application.tasker === input.tasker,
  );

  const decision = canApply({
    taskerId: input.tasker,
    kind,
    task: {
      posterId: input.task.poster,
      status: input.task.status,
      hiringMode: input.task.hiringMode,
    },
    verification: input.verification,
    existingStatuses: existing.map((application) => application.status),
  });

  if (!decision.allowed) {
    return { ok: false, reason: decision.reason };
  }

  const draft: DemoApplication = {
    id: input.id,
    taskId: input.task.id,
    tasker: input.tasker,
    kind,
    status: "submitted",
    amountCents:
      kind === "bid" ? parseAmount(input.values.amount) : Math.round(input.task.budget * 100),
    message: input.values.message.trim() || null,
    estimatedTime:
      kind === "bid" ? input.values.estimatedTime.trim() || null : null,
    verification: input.verification,
    createdAt: now.toISOString(),
  };

  const reusable = existing.find(
    (application) =>
      application.status === "withdrawn" || application.status === "invalidated",
  );

  if (reusable) {
    return {
      ok: true,
      application: { ...draft, id: reusable.id },
      applications: input.applications.map((application) =>
        application.id === reusable.id ? { ...draft, id: reusable.id } : application,
      ),
    };
  }

  return {
    ok: true,
    application: draft,
    applications: [...input.applications, draft],
  };
}

export type WithdrawResult =
  | { ok: true; applications: DemoApplication[] }
  | { ok: false; reason: string };

export function withdrawApplication(input: {
  applications: readonly DemoApplication[];
  task: TaskSummary;
  tasker: string;
  id: string;
}): WithdrawResult {
  const application = input.applications.find((item) => item.id === input.id);

  if (!application || application.tasker !== input.tasker) {
    return { ok: false, reason: "Application not found." };
  }

  const decision = canWithdraw({
    applicationStatus: application.status,
    taskStatus: input.task.status,
  });

  if (!decision.allowed) {
    return { ok: false, reason: decision.reason };
  }

  return {
    ok: true,
    applications: input.applications.map((item) =>
      item.id === application.id ? { ...item, status: "withdrawn" } : item,
    ),
  };
}

/** Whether the Poster can select this applicant, and why not. */
export function approvalFor(
  application: DemoApplication,
  task: TaskSummary,
  verificationOverride?: TaskerVerificationStatus,
): { approvable: boolean; reason: string | null } {
  const decision = canApprove({
    applicationStatus: application.status,
    taskStatus: task.status,
    verification: verificationOverride ?? application.verification,
  });

  return {
    approvable: decision.allowed,
    reason: decision.allowed ? null : decision.reason,
  };
}

function newestFirst(applications: readonly DemoApplication[]): DemoApplication[] {
  return [...applications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function applicationsForTask(
  applications: readonly DemoApplication[],
  taskId: string,
): DemoApplication[] {
  return newestFirst(applications.filter((application) => application.taskId === taskId));
}

export function applicationsForTasker(
  applications: readonly DemoApplication[],
  tasker: string,
): DemoApplication[] {
  return newestFirst(
    applications.filter((application) => application.tasker === tasker),
  );
}

export function liveApplicationFor(
  applications: readonly DemoApplication[],
  taskId: string,
  tasker: string,
): DemoApplication | null {
  return (
    applications.find(
      (application) =>
        application.taskId === taskId &&
        application.tasker === tasker &&
        isLiveApplicationStatus(application.status),
    ) ?? null
  );
}

/** A material task change invalidates every live application on that task. */
export function invalidateApplications(
  applications: readonly DemoApplication[],
  taskId: string,
): DemoApplication[] {
  return applications.map((application) =>
    application.taskId === taskId && isLiveApplicationStatus(application.status)
      ? { ...application, status: "invalidated" }
      : application,
  );
}
