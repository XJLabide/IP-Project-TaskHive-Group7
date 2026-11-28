import type { TaskerVerification } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyAdmins, notifyUser } from "@/lib/notifications";
import { parseProviderResult } from "./provider";
import { toDbAppeal, toDbStatus, toDomainAppeal, toDomainStatus } from "./mapping";
import { deleteVerificationDocument } from "./document";
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
  eventKey: string,
): Promise<void> {
  for (const effect of effects) {
    switch (effect.type) {
      case "notify_posters":
        for (const posterId of affectedPosters) {
          await notifyUser({
            userId: posterId,
            type: "verification.tasker_rejected",
            title: "A Tasker application changed",
            body: "A Tasker did not pass identity verification, so their application was withdrawn.",
            eventKey: `${eventKey}:poster:${posterId}`,
          });
        }
        break;
      case "notify_admins":
        await notifyAdmins({
          type: "verification.appeal_submitted",
          title: "A Tasker verification appeal needs review",
          body: "A Tasker submitted an identity-verification appeal. Sign in to review it.",
          href: "/admin",
          eventKey: `${eventKey}:admins`,
        });
        break;
      case "notify_applicant":
        await notifyUser({
          userId,
          type: "verification.decision",
          title: "Your Tasker verification status changed",
          body: effect.reason ?? "Sign in to review your verification status.",
          href: "/profile#verification",
          eventKey: `${eventKey}:tasker:${userId}`,
        });
        break;
      case "require_fresh_applications":
        await notifyUser({
          userId,
          type: "verification.appeal_approved",
          title: "Your verification appeal was approved",
          body: "You can now submit applications for tasks again.",
          href: "/profile#verification",
          eventKey: `${eventKey}:appeal-approved:${userId}`,
        });
        break;
      case "withdraw_applications":
        break;
    }
  }
}

/**
 * Applies one lifecycle event, persisting only status/reference metadata.
 * Claim the observed lifecycle state before applying withdrawals or audit
 * writes. A competing decision must not overwrite it or emit losing effects.
 * Notifications run only after the winning transaction commits.
 */
export async function applyVerificationEvent(
  userId: string,
  event: VerificationEvent,
  options: { adminId?: string; notes?: string; document?: { publicId: string; format: string; uploadedAt: Date; consentedAt: Date } } = {},
): Promise<VerificationResult> {
  if (event.type === "submitted" && !options.document) {
    return { ok: false, code: "invalid_transition", reason: "Upload an ID image before submitting verification." };
  }

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
    event.type === "admin_approved" ||
    event.type === "admin_rejected" ||
    event.type === "appeal_approved" ||
    event.type === "appeal_denied";

  const committed = await prisma.$transaction(async (tx) => {
    let affectedPosters: string[] = [];

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
      ...(event.type === "submitted" && options.document ? {
        idDocumentPublicId: options.document.publicId,
        idDocumentFormat: options.document.format,
        idDocumentUploadedAt: options.document.uploadedAt,
        idDocumentConsentAt: options.document.consentedAt,
      } : {}),
      ...(decided ? { decidedAt: now } : {}),
      ...(withdraws ? { applicationsWithdrawnAt: now } : {}),
    };

    if (existing) {
      // These fields identify a lifecycle step: transitions never return to a
      // previous combination of status, appeal status, and appeal count.
      const claimed = await tx.taskerVerification.updateMany({
        where: {
          id: existing.id,
          status: existing.status,
          appealStatus: existing.appealStatus,
          appealCount: existing.appealCount,
        },
        data,
      });
      if (claimed.count === 0) return { claimed: false as const, affectedPosters };
    } else {
      // The unique userId arbitrates concurrent first submissions. Never use
      // an upsert here: its update could reset a decision made since our read.
      const claimed = await tx.taskerVerification.createMany({
        data: { userId, ...data },
        skipDuplicates: true,
      });
      if (claimed.count === 0) return { claimed: false as const, affectedPosters };
    }

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

    if (options.adminId && (event.type === "admin_approved" || event.type === "admin_rejected" || event.type === "appeal_approved" || event.type === "appeal_denied")) {
      await tx.adminAction.create({
        data: {
          adminId: options.adminId,
          action: event.type === "admin_approved" || event.type === "admin_rejected"
            ? `verification.identity.${event.type === "admin_approved" ? "approved" : "rejected"}`
            : `verification.appeal.${event.type === "appeal_approved" ? "approved" : "denied"}`,
          targetType: "TaskerVerification",
          targetId: userId,
          notes:
            options.notes?.trim() ||
            (event.type === "appeal_denied" || event.type === "admin_rejected" ? event.reason : null),
          metadata: {
            outcome: event.type === "appeal_approved" || event.type === "admin_approved" ? "approved" : "denied",
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
      reason: "Verification changed while this request was being processed. Reload its status before trying again.",
    };
  }

  const finalReviewDecision = event.type === "admin_approved" || event.type === "admin_rejected" || event.type === "appeal_approved" || event.type === "appeal_denied";
  if (finalReviewDecision) {
    const document = await prisma.taskerVerification.findUnique({ where: { userId }, select: { idDocumentPublicId: true } });
    if (document?.idDocumentPublicId) {
      const deleted = await deleteVerificationDocument(document.idDocumentPublicId).catch(() => false);
      if (deleted) {
        await prisma.taskerVerification.updateMany({
          where: { userId, status: toDbStatus[result.state.status], idDocumentPublicId: document.idDocumentPublicId },
          data: { idDocumentPublicId: null, idDocumentFormat: null, idDocumentUploadedAt: null },
        });
      }
    }
  }

  await runEffects(
    userId,
    result.effects,
    committed.affectedPosters,
    `verification:${event.type}:${userId}:${now.toISOString()}`,
  );

  return { ok: true, state: result.state };
}

export async function decideIdentitySubmission(
  userId: string,
  outcome: "approved" | "denied",
  reason: string,
  adminId: string,
) {
  return applyVerificationEvent(
    userId,
    outcome === "approved" ? { type: "admin_approved" } : { type: "admin_rejected", reason },
    { adminId, notes: reason },
  );
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
      { adminId, notes: reason },
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
