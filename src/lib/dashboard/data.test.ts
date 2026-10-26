import { describe, expect, it } from "vitest";
import type { DemoApplication } from "@/lib/applications/demo";
import type { DemoChat } from "@/lib/chat/demo";
import type { DemoAssignment } from "@/lib/payments/demo";
import type { TaskSummary } from "@/lib/tasks/types";
import { buildDashboard, dashboardViewState } from "./data";

const now = new Date("2026-10-27T12:00:00.000Z");
const viewer = { signedIn: true, displayName: "Maria Santos" };

function task({
  id,
  ...overrides
}: Partial<TaskSummary> & { id: string }): TaskSummary {
  return {
    title: "Pick up groceries",
    description: "Buy groceries from the community market.",
    category: "Delivery",
    fulfillmentMode: "local",
    hiringMode: "bidding",
    status: "open",
    budget: 450,
    location: "Sampaloc, Manila",
    deadline: "2026-10-30T09:00:00.000Z",
    poster: "Maria Santos",
    applications: 0,
    ...overrides,
    id,
  };
}

function application({
  id,
  taskId,
  ...overrides
}: Partial<DemoApplication> & { id: string; taskId: string }): DemoApplication {
  return {
    tasker: "Marco Cruz",
    kind: "bid",
    status: "submitted",
    amountCents: 28000,
    message: "I can start now.",
    estimatedTime: "10 minutes",
    verification: "verified",
    createdAt: "2026-10-26T08:10:00.000Z",
    ...overrides,
    id,
    taskId,
  };
}

function assignment({
  id,
  taskId,
  ...overrides
}: Partial<DemoAssignment> & { id: string; taskId: string }): DemoAssignment {
  return {
    tasker: "Marco Cruz",
    applicationId: `application_${id}`,
    status: "active",
    selectedAt: "2026-10-26T09:00:00.000Z",
    holdExpiresAt: "2026-10-27T09:00:00.000Z",
    amountCents: 28000,
    platformFeeCents: 1400,
    payoutCents: 26600,
    paymentStatus: "paid",
    attemptCount: 1,
    lastError: null,
    paidAt: "2026-10-26T09:05:00.000Z",
    ...overrides,
    id,
    taskId,
  };
}

function chat({
  id,
  taskId,
  ...overrides
}: Partial<DemoChat> & { id: string; taskId: string }): DemoChat {
  return {
    opener: "Marco Cruz",
    poster: "Maria Santos",
    createdAt: "2026-10-25T08:30:00.000Z",
    messages: [],
    ...overrides,
    id,
    taskId,
  };
}

describe("created tasks", () => {
  it("keeps only the signed-in Poster's tasks", () => {
    const data = buildDashboard({
      viewer,
      tasks: [
        task({ id: "task_mine", title: "Pick up groceries", poster: "Maria Santos" }),
        task({ id: "task_theirs", title: "Clean storage room", poster: "Jose Reyes" }),
      ],
      applications: [],
      assignments: [],
      chats: [],
      now,
    });

    expect(data.scope).toBe("ready");
    expect(data.postedTasks).toEqual([
      expect.objectContaining({
        id: "task_mine",
        title: "Pick up groceries",
        status: "open",
        awaitingReview: 0,
        assignmentStatus: null,
        href: "/tasks/task_mine",
      }),
    ]);
    expect(data.summary?.openTasks).toBe(1);
  });
});

describe("applications awaiting review", () => {
  it("reads submitted applications from records, not the task counter", () => {
    const data = buildDashboard({
      viewer,
      tasks: [task({ id: "task_1", applications: 99 })],
      applications: [
        application({
          id: "app_older",
          taskId: "task_1",
          tasker: "Marco Cruz",
          createdAt: "2026-10-26T08:10:00.000Z",
        }),
        application({
          id: "app_newer",
          taskId: "task_1",
          tasker: "Lia Ramos",
          createdAt: "2026-10-26T09:10:00.000Z",
        }),
        application({
          id: "app_withdrawn",
          taskId: "task_1",
          tasker: "Ana Reyes",
          status: "withdrawn",
        }),
        application({
          id: "app_other",
          taskId: "task_other",
          tasker: "Ana Reyes",
        }),
      ],
      assignments: [],
      chats: [],
      now,
    });

    expect(data.awaitingReview.map((row) => row.id)).toEqual([
      "app_newer",
      "app_older",
    ]);
    expect(data.awaitingReview[0]).toMatchObject({
      taskTitle: "Pick up groceries",
      tasker: "Lia Ramos",
      amountCents: 28000,
      href: "/tasks/task_1",
    });
    expect(data.summary?.awaitingReview).toBe(2);
    expect(data.postedTasks[0].awaitingReview).toBe(2);
  });
  it("stops counting review requests once the task leaves the open state", () => {
    const data = buildDashboard({
      viewer,
      tasks: [
        task({ id: "task_assigned", status: "assigned" }),
        task({ id: "task_draft", status: "draft" }),
      ],
      applications: [
        application({ id: "app_assigned", taskId: "task_assigned" }),
        application({ id: "app_draft", taskId: "task_draft" }),
      ],
      assignments: [],
      chats: [],
      now,
    });

    expect(data.awaitingReview).toEqual([]);
    expect(data.summary?.awaitingReview).toBe(0);
    expect(data.postedTasks.every((row) => row.awaitingReview === 0)).toBe(true);
  });
});

describe("active assignments", () => {
  it("lists paid assignments where the viewer is Poster or Tasker", () => {
    const data = buildDashboard({
      viewer,
      tasks: [
        task({ id: "task_mine", status: "assigned" }),
        task({ id: "task_hold", status: "pending_payment" }),
        task({ id: "task_theirs", status: "assigned", poster: "Jose Reyes" }),
        task({ id: "task_unrelated", status: "assigned", poster: "Jose Reyes" }),
      ],
      applications: [],
      assignments: [
        assignment({
          id: "assignment_poster",
          taskId: "task_mine",
          tasker: "Marco Cruz",
          paidAt: "2026-10-26T09:05:00.000Z",
        }),
        assignment({
          id: "assignment_hold",
          taskId: "task_hold",
          tasker: "Marco Cruz",
          status: "pending_payment",
          paymentStatus: "checkout_started",
          paidAt: null,
        }),
        assignment({
          id: "assignment_tasker",
          taskId: "task_theirs",
          tasker: "Maria Santos",
          paidAt: "2026-10-26T10:05:00.000Z",
        }),
        assignment({
          id: "assignment_unrelated",
          taskId: "task_unrelated",
          tasker: "Lia Ramos",
        }),
      ],
      chats: [],
      now,
    });

    expect(data.activeAssignments).toEqual([
      expect.objectContaining({
        id: "assignment_tasker",
        taskId: "task_theirs",
        taskTitle: "Pick up groceries",
        role: "tasker",
        payoutCents: 26600,
      }),
      expect.objectContaining({
        id: "assignment_poster",
        taskId: "task_mine",
        role: "poster",
      }),
    ]);
    expect(data.summary?.activeAssignments).toBe(2);
    expect(
      data.postedTasks.find((row) => row.id === "task_mine")?.assignmentStatus,
    ).toBe("active");
    expect(
      data.postedTasks.find((row) => row.id === "task_hold")?.assignmentStatus,
    ).toBe("pending_payment");
  });
});

describe("payment actions", () => {
  it("turns an open hold into a complete-payment action for the Poster", () => {
    const data = buildDashboard({
      viewer,
      tasks: [task({ id: "task_hold", status: "pending_payment" })],
      applications: [],
      assignments: [
        assignment({
          id: "assignment_hold",
          taskId: "task_hold",
          status: "pending_payment",
          paymentStatus: "unpaid",
          attemptCount: 0,
          paidAt: null,
          holdExpiresAt: "2026-10-28T12:00:00.000Z",
        }),
      ],
      chats: [],
      now,
    });

    expect(data.actions).toEqual([
      expect.objectContaining({
        id: "assignment_hold",
        kind: "complete_payment",
        taskId: "task_hold",
        taskTitle: "Pick up groceries",
        label: "Complete payment",
        dueAt: "2026-10-28T12:00:00.000Z",
        tone: "pending",
        href: "/tasks/task_hold",
      }),
    ]);
    expect(data.summary?.paymentActions).toBe(1);
  });
  it("does not treat an in-flight checkout as a failure", () => {
    const data = buildDashboard({
      viewer,
      tasks: [task({ id: "task_hold", status: "pending_payment" })],
      applications: [],
      assignments: [
        assignment({
          id: "assignment_hold",
          taskId: "task_hold",
          status: "pending_payment",
          paymentStatus: "checkout_started",
          attemptCount: 1,
          lastError: null,
          paidAt: null,
          holdExpiresAt: "2026-10-28T12:00:00.000Z",
        }),
      ],
      chats: [],
      now,
    });

    expect(data.actions[0]).toMatchObject({
      kind: "complete_payment",
      label: "Complete payment",
      tone: "pending",
    });
  });

  it("asks for a retry after a failed checkout attempt", () => {
    const data = buildDashboard({
      viewer,
      tasks: [task({ id: "task_hold", status: "pending_payment" })],
      applications: [],
      assignments: [
        assignment({
          id: "assignment_hold",
          taskId: "task_hold",
          status: "pending_payment",
          paymentStatus: "unpaid",
          attemptCount: 2,
          lastError: "The provider could not complete the payment. Try again.",
          paidAt: null,
          holdExpiresAt: "2026-10-28T12:00:00.000Z",
        }),
      ],
      chats: [],
      now,
    });

    expect(data.actions[0]).toMatchObject({
      kind: "retry_payment",
      label: "Retry payment",
      tone: "negative",
    });
  });
  it("flags an expired hold and points back to the reopened task", () => {
    const data = buildDashboard({
      viewer,
      tasks: [task({ id: "task_hold", status: "pending_payment" })],
      applications: [],
      assignments: [
        assignment({
          id: "assignment_hold",
          taskId: "task_hold",
          status: "pending_payment",
          paymentStatus: "unpaid",
          attemptCount: 0,
          paidAt: null,
          holdExpiresAt: "2026-10-27T11:00:00.000Z",
        }),
      ],
      chats: [],
      now,
    });

    expect(data.actions[0]).toMatchObject({
      kind: "hold_expired",
      label: "Review task",
      tone: "negative",
      dueAt: "2026-10-27T11:00:00.000Z",
    });
  });

  it("keeps payment actions private to the Poster", () => {
    const data = buildDashboard({
      viewer: { signedIn: true, displayName: "Marco Cruz" },
      tasks: [task({ id: "task_hold", status: "pending_payment" })],
      applications: [],
      assignments: [
        assignment({
          id: "assignment_hold",
          taskId: "task_hold",
          tasker: "Marco Cruz",
          status: "pending_payment",
          paymentStatus: "unpaid",
          paidAt: null,
        }),
      ],
      chats: [],
      now,
    });

    expect(data.actions).toEqual([]);
    expect(data.summary?.paymentActions).toBe(0);
  });
});

describe("activity feed", () => {
  it("shows only the viewer's events, newest first", () => {
    const data = buildDashboard({
      viewer,
      tasks: [
        task({ id: "task_mine", title: "Pick up groceries" }),
        task({
          id: "task_theirs",
          title: "Clean storage room",
          poster: "Jose Reyes",
        }),
        task({
          id: "task_unrelated",
          title: "Math tutoring",
          poster: "Jose Reyes",
        }),
      ],
      applications: [
        application({
          id: "app_incoming",
          taskId: "task_mine",
          tasker: "Marco Cruz",
          createdAt: "2026-10-26T08:10:00.000Z",
        }),
        application({
          id: "app_mine",
          taskId: "task_theirs",
          tasker: "Maria Santos",
          createdAt: "2026-10-26T09:00:00.000Z",
        }),
      ],
      assignments: [
        assignment({
          id: "assignment_mine",
          taskId: "task_mine",
          selectedAt: "2026-10-26T10:00:00.000Z",
          paidAt: "2026-10-26T10:05:00.000Z",
        }),
      ],
      chats: [
        chat({
          id: "chat_mine",
          taskId: "task_mine",
          opener: "Marco Cruz",
          poster: "Maria Santos",
          messages: [
            {
              id: "message_marco",
              sender: "Marco Cruz",
              body: "Is the list final?",
              createdAt: "2026-10-26T11:00:00.000Z",
              reported: false,
            },
            {
              id: "message_mine",
              sender: "Maria Santos",
              body: "Yes, it is final.",
              createdAt: "2026-10-26T11:30:00.000Z",
              reported: false,
            },
          ],
        }),
        chat({
          id: "chat_unrelated",
          taskId: "task_unrelated",
          opener: "Lia Ramos",
          poster: "Jose Reyes",
          messages: [
            {
              id: "message_unrelated",
              sender: "Lia Ramos",
              body: "Can we reschedule?",
              createdAt: "2026-10-26T12:00:00.000Z",
              reported: false,
            },
          ],
        }),
      ],
      now,
    });

    expect(data.activity.map((item) => item.kind)).toEqual([
      "message",
      "message",
      "payment_completed",
      "tasker_selected",
      "application_submitted",
      "application_submitted",
    ]);
    expect(data.activity.map((item) => item.createdAt)).toEqual([
      "2026-10-26T11:30:00.000Z",
      "2026-10-26T11:00:00.000Z",
      "2026-10-26T10:05:00.000Z",
      "2026-10-26T10:00:00.000Z",
      "2026-10-26T09:00:00.000Z",
      "2026-10-26T08:10:00.000Z",
    ]);
    expect(data.activity.map((item) => item.id)).not.toContain(
      "message:message_unrelated",
    );
    expect(data.activity.find((item) => item.kind === "message")).toMatchObject({
      description: "You messaged Marco Cruz about Pick up groceries.",
      role: "poster",
    });
  });
  it("caps the feed to the newest events", () => {
    const messages = Array.from({ length: 10 }, (_, index) => ({
      id: `message_${index}`,
      sender: "Marco Cruz",
      body: `Message ${index}`,
      createdAt: `2026-10-26T0${index}:00:00.000Z`,
      reported: false,
    }));

    const data = buildDashboard({
      viewer,
      tasks: [task({ id: "task_1" })],
      applications: [],
      assignments: [],
      chats: [chat({ id: "chat_1", taskId: "task_1", messages })],
      now,
    });

    expect(data.activity).toHaveLength(8);
    expect(data.activity[0].createdAt).toBe("2026-10-26T09:00:00.000Z");
  });
});

describe("dashboard state", () => {
  it("reports an empty workspace without inventing activity", () => {
    const data = buildDashboard({
      viewer,
      tasks: [task({ id: "task_theirs", poster: "Jose Reyes" })],
      applications: [
        application({ id: "app_theirs", taskId: "task_theirs" }),
      ],
      assignments: [
        assignment({
          id: "assignment_theirs",
          taskId: "task_theirs",
          tasker: "Lia Ramos",
        }),
      ],
      chats: [chat({ id: "chat_theirs", taskId: "task_theirs" })],
      now,
    });

    expect(data.scope).toBe("empty");
    expect(data.summary).toEqual({
      openTasks: 0,
      awaitingReview: 0,
      activeAssignments: 0,
      paymentActions: 0,
    });
    expect(data.activity).toEqual([]);
    expect(data.actions).toEqual([]);
  });

  it("maps store readiness and failures to one view state", () => {
    expect(dashboardViewState({ ready: false, error: false, scope: "empty" })).toBe(
      "loading",
    );
    expect(dashboardViewState({ ready: true, error: true, scope: "ready" })).toBe(
      "error",
    );
    expect(
      dashboardViewState({ ready: true, error: false, scope: "signed_out" }),
    ).toBe("signed_out");
    expect(dashboardViewState({ ready: true, error: false, scope: "empty" })).toBe(
      "empty",
    );
    expect(dashboardViewState({ ready: true, error: false, scope: "ready" })).toBe(
      "ready",
    );
  });
});

describe("signed-out dashboard", () => {
  it("returns no marketplace data for a guest", () => {
    const data = buildDashboard({
      viewer: { signedIn: false, displayName: null },
      tasks: [task({ id: "task_1" })],
      applications: [application({ id: "app_1", taskId: "task_1" })],
      assignments: [assignment({ id: "assignment_1", taskId: "task_1" })],
      chats: [chat({ id: "chat_1", taskId: "task_1" })],
      now,
    });

    expect(data.scope).toBe("signed_out");
    expect(data.displayName).toBeNull();
    expect(data.summary).toBeNull();
    expect(data.postedTasks).toEqual([]);
    expect(data.awaitingReview).toEqual([]);
    expect(data.activeAssignments).toEqual([]);
    expect(data.activity).toEqual([]);
    expect(data.actions).toEqual([]);
  });

  it("treats a signed-in viewer without a display name as unscoped", () => {
    const data = buildDashboard({
      viewer: { signedIn: true, displayName: "   " },
      tasks: [task({ id: "task_1" })],
      applications: [application({ id: "app_1", taskId: "task_1" })],
      assignments: [assignment({ id: "assignment_1", taskId: "task_1" })],
      chats: [chat({ id: "chat_1", taskId: "task_1" })],
      now,
    });

    expect(data.scope).toBe("signed_out");
    expect(data.postedTasks).toEqual([]);
    expect(data.activity).toEqual([]);
  });
});
