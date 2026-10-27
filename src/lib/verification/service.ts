import type { TaskerVerification } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publishJob } from "@/lib/queue/qstash";
import { parseProviderResult } from "./provider";
import { toDbAppeal, toDbStatus, toDomainAppeal, toDomainStatus } from "./mapping";
import {
  initialVerificationState,
  transition,
  type VerificationEffect,
  type VerificationEvent,
  type VerificationState,
} from "./lifecycle";

export type VerificationResult =
  | { ok: true; state: VerificationState }
  | {
      ok: false;
      code: "invalid_transition" | "invalid_provider_result";
      reason: string;
    };

function toState(record: TaskerVerification | null): VerificationState {
  if (!record) return initialVerificationState();

  return {
    status: toDomainStatus[record.status],
    providerReference: record.providerReference,
    rejectionReason: record.rejectionReason,
    appealCount: record.appealCount,
    appealStatus: toDomainAppeal[record.appealStatus],
  };
}

export async function getVerification(userId: string): Promise<VerificationState> {
  return toState(
    await prisma.taskerVerification.findUnique({ where: { userId } }),
  );
}

/** Poster ids for the applications a rejection is about to withdraw. */
async function collectAffectedPosters(
  executor: Pick<typeof prisma, "bid" | "taskRequest">,
  userId: string,
): Promise<string[]> {
  const [bids, requests] = await Promise.all([
    executor.bid.findMany({
      where: { taskerId: userId, status: "SUBMITTED" },
      select: { task: { select: { posterId: true } } },
    }),
    executor.taskRequest.findMany({
      where: { taskerId: userId, status: "SUBMITTED" },
      select: { task: { select: { posterId: true } } },
    }),
  ]);

  return [...new Set([...bids, ...requests].map((row) => row.task.posterId))];
}

async function runEffects(
  userId: string,
  effects: VerificationEffect[],
  affectedPosters: string[],
): Promise<void> {
  for (const effect of effects) {
    switch (effect.type) {
      case "notify_posters":
        for (const posterId of affectedPosters) {
          await publishJob("notify.poster.tasker.verification", {
            posterId,
            taskerId: userId,
            reason: effect.reason,
          });
        }
        break;
      case "notify_admins":
        await publishJob("notify.admin.verification.appeal", { taskerId: userId });
        break;
      case "notify_applicant":
        await publishJob("notify.tasker.verification.decision", {
          taskerId: userId,
          reason: effect.reason,
        });
        break;
      case "require_fresh_applications":
        await publishJob("notify.tasker.verification.appeal.approved", {
          taskerId: userId,
          action: "resubmit_applications",
        });
        break;
      case "withdraw_applications":
        break;
    }
  }
}

/**
 * Applies one lifecycle event, persisting only status/reference metadata.
 * Withdrawals, the appeal claim, and persistence share one transaction so a
 * duplicate appeal or a mid-flight bid cannot slip through; notifications run
 * after commit.
 */
export async function applyVerificationEvent(
  userId: string,
  event: VerificationEvent,
  options: { adminId?: string } = {},
): Promise<VerificationResult> {
  const existing = await prisma.taskerVerification.findUnique({ where: { userId } });
  const result = transition(toState(existing), event);

  if (!result.ok) return result;

  const now = new Date();
  const withdraws = result.effects.some(
    (effect) => effect.type === "withdraw_applications",
  );
  const decided =
    event.type === "provider_approved" ||
    event.type === "provider_rejected" ||
    event.type === "appeal_approved" ||
    event.type === "appeal_denied";

  const committed = await prisma.$transaction(async (tx) => {
    let affectedPosters: string[] = [];

    if (withdraws) {
      affectedPosters = await collectAffectedPosters(tx, userId);
      await tx.bid.updateMany({
        where: { taskerId: userId, status: "SUBMITTED" },
        data: { status: "WITHDRAWN" },
      });
      await tx.taskRequest.updateMany({
        where: { taskerId: userId, status: "SUBMITTED" },
        data: { status: "WITHDRAWN" },
      });
    }

    if (event.type === "appeal_submitted") {
      // Claim the single appeal atomically: the guard and the write are one statement.
      const claimed = await tx.taskerVerification.updateMany({
        where: { userId, appealCount: 0, status: "REJECTED" },
        data: {
          appealCount: 1,
          appealStatus: toDbAppeal.pending,
          appealedAt: now,
          appealNote: event.note ?? null,
        },
      });

      if (claimed.count === 0) return { claimed: false as const, affectedPosters };
      return { claimed: true as const, affectedPosters };
    }

    const data = {
      status: toDbStatus[result.state.status],
      providerReference: result.state.providerReference,
      rejectionReason: result.state.rejectionReason,
      appealStatus: toDbAppeal[result.state.appealStatus],
      appealCount: result.state.appealCount,
      ...(event.type === "submitted" ? { submittedAt: now } : {}),
      ...(decided ? { decidedAt: now } : {}),
      ...(withdraws ? { applicationsWithdrawnAt: now } : {}),
    };

    await tx.taskerVerification.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    if (options.adminId && (event.type === "appeal_approved" || event.type === "appeal_denied")) {
      await tx.adminAction.create({
        data: {
          adminId: options.adminId,
          action: `verification.appeal.${event.type === "appeal_approved" ? "approved" : "denied"}`,
          targetType: "TaskerVerification",
          targetId: userId,
          notes: event.type === "appeal_denied" ? event.reason : null,
          metadata: {
            outcome: event.type === "appeal_approved" ? "approved" : "denied",
          },
        },
      });
    }

    return { claimed: true as const, affectedPosters };
  });

  if (!committed.claimed) {
    return {
      ok: false,
      code: "invalid_transition",
      reason: "The one available appeal has already been used.",
    };
  }

  await runEffects(userId, result.effects, committed.affectedPosters);

  return { ok: true, state: result.state };
}

/** Provider callback: accepts a decision, ignores anything else it carries. */
export async function applyProviderResult(
  userId: string,
  payload: unknown,
): Promise<VerificationResult> {
  const parsed = parseProviderResult(payload);
  if (!parsed.ok) return parsed;
  return applyVerificationEvent(userId, parsed.event);
}

export async function submitAppeal(
  userId: string,
  note: string,
): Promise<VerificationResult> {
  return applyVerificationEvent(userId, { type: "appeal_submitted", note });
}

export async function decideAppeal(
  userId: string,
  outcome: "approved" | "denied",
  reason: string | undefined,
  adminId: string,
): Promise<VerificationResult> {
  if (outcome === "approved") {
    return applyVerificationEvent(
      userId,
      { type: "appeal_approved" },
      { adminId },
    );
  }
  return applyVerificationEvent(
    userId,
    {
      type: "appeal_denied",
      reason: reason?.trim() || "Appeal denied by Admin.",
    },
    { adminId },
  );
}
