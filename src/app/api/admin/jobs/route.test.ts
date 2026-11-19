import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdminMock,
  okMock,
  problemMock,
  getScheduleStatusMock,
  scheduleConfigSnapshotMock,
  upsertSchedulesMock,
  computeJobBacklogMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  okMock: vi.fn((data: unknown) => Response.json({ data })),
  problemMock: vi.fn((message: string, status: number) =>
    Response.json({ error: message }, { status }),
  ),
  getScheduleStatusMock: vi.fn(),
  scheduleConfigSnapshotMock: vi.fn(),
  upsertSchedulesMock: vi.fn(),
  computeJobBacklogMock: vi.fn(),
}));

vi.mock("@/lib/api/response", () => ({
  ok: okMock,
  problem: problemMock,
  requireAdmin: requireAdminMock,
}));
vi.mock("@/lib/queue/schedules", () => ({
  getScheduleStatus: getScheduleStatusMock,
  scheduleConfigSnapshot: scheduleConfigSnapshotMock,
  upsertSchedules: upsertSchedulesMock,
}));
vi.mock("@/lib/queue/monitor", () => ({
  computeJobBacklog: computeJobBacklogMock,
}));

import { GET, POST } from "./route";

const scheduleState = {
  configured: true,
  signingConfigured: true,
  listError: null,
  jobs: [
    {
      name: "assignments.expire_holds",
      description: "Reopen expired holds",
      expectedCron: "*/5 * * * *",
      scheduleId: "sched_1",
      actualCron: "*/5 * * * *",
      isPaused: false,
      lastScheduleTime: 1700000000000,
      nextScheduleTime: 1700000300000,
      lastScheduleStates: { msg_1: "SUCCESS" },
    },
  ],
};

const config = { tokenSet: true, destinationUrl: "https://x/api/jobs", signingConfigured: true };
const backlog = {
  expiredHolds: 1,
  dueReminders: 0,
  dueAutoRelease: 0,
  dueReviews: 0,
  pendingEmail: 2,
  failedEmail: 3,
};

function adminRequest() {
  return new Request("https://taskhive.example/api/admin/jobs");
}

describe("admin jobs monitoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminMock.mockResolvedValue({ response: null });
    getScheduleStatusMock.mockResolvedValue(scheduleState);
    scheduleConfigSnapshotMock.mockReturnValue(config);
    computeJobBacklogMock.mockResolvedValue(backlog);
  });

  it("returns schedule status and backlog to admins", async () => {
    const response = await GET(adminRequest());

    expect(requireAdminMock).toHaveBeenCalled();
    const body = await response.json();
    expect(body.data).toEqual({
      config,
      schedules: scheduleState.jobs,
      listError: null,
      backlog,
    });
  });

  it("returns the auth failure without touching schedules", async () => {
    requireAdminMock.mockResolvedValue({
      response: Response.json({ error: "Admin access required" }, { status: 403 }),
    });

    const response = await GET(adminRequest());

    expect(response.status).toBe(403);
    expect(getScheduleStatusMock).not.toHaveBeenCalled();
    expect(computeJobBacklogMock).not.toHaveBeenCalled();
  });
});

describe("admin jobs provisioning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminMock.mockResolvedValue({ response: null });
  });

  it("provisions schedules and returns the reconciliation result", async () => {
    upsertSchedulesMock.mockResolvedValue({
      ok: true,
      created: ["assignments.expire_holds"],
      skipped: [],
      drifted: [],
      failures: [],
    });

    const response = await POST(adminRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.ok).toBe(true);
    expect(body.data.created).toEqual(["assignments.expire_holds"]);
  });

  it("maps a missing QStash configuration to 503", async () => {
    upsertSchedulesMock.mockResolvedValue({
      ok: false,
      reason: "QStash is not configured in this environment.",
    });

    const response = await POST(adminRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      error: "QStash is not configured in this environment.",
    });
  });
});
