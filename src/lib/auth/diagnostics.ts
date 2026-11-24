import "server-only";
import { randomUUID } from "node:crypto";
import { cache } from "react";
import { isRequestId, REQUEST_ID_HEADER } from "@/lib/request-id";

type AuthStage = "session_cookie_decode" | "firebase_setup" | "firebase_verify_session" | "firebase_verify_id_token" | "firebase_create_session" | "database_read_user" | "database_sync_email" | "database_upsert_user" | "session_completion";
type AuthCategory = "malformed_cookie" | "session_expired" | "session_revoked" | "session_invalid" | "account_disabled" | "identity_email_missing" | "domain_user_missing" | "firebase_configuration" | "firebase_unavailable" | "firebase_failure" | "database_configuration" | "database_unavailable" | "database_conflict" | "database_failure" | "unexpected_failure";
type AuthOutcome = "authenticated" | "denied";

const renderRequestId = cache(() => randomUUID());

/** Proxy overwrites this header on HTTP requests. The fallback shares an ID
 * only inside the current React render; it never memoizes an auth result.
 */
export function authRequestId(headers: Headers): string {
  const id = headers.get(REQUEST_ID_HEADER);
  return isRequestId(id) ? id : renderRequestId();
}

function errorCode(error: unknown): string | undefined {
  try {
    if (typeof error !== "object" || error === null) return;
    for (const field of ["code", "errorCode"] as const) {
      const value = (error as Record<string, unknown>)[field];
      if (typeof value === "string") return value;
    }
  } catch { /* Diagnostics must not depend on arbitrary error getters. */ }
}

function categoryFor(stage: AuthStage, error: unknown): AuthCategory {
  const code = errorCode(error);
  if (stage.startsWith("database_")) {
    if (["P1000", "P1003", "P1010", "P1012", "P1013"].includes(code ?? "")) return "database_configuration";
    if (["P1001", "P1002", "P1008", "P1017", "P2024"].includes(code ?? "")) return "database_unavailable";
    return code === "P2002" ? "database_conflict" : "database_failure";
  }
  if (stage === "session_cookie_decode") return "malformed_cookie";
  if (stage === "firebase_setup") return "firebase_configuration";
  switch (code) {
    case "auth/session-cookie-expired": case "auth/id-token-expired": return "session_expired";
    case "auth/session-cookie-revoked": case "auth/id-token-revoked": return "session_revoked";
    case "auth/user-disabled": return "account_disabled";
    case "auth/argument-error": case "auth/invalid-id-token": case "auth/invalid-session-cookie": case "auth/user-not-found": return "session_invalid";
    case "auth/invalid-credential": case "app/invalid-credential": case "app/invalid-app-options": return "firebase_configuration";
    case "auth/internal-error": case "auth/network-request-failed": case "auth/too-many-requests": case "app/network-error": case "app/network-timeout": return "firebase_unavailable";
    default: return "firebase_failure";
  }
}

/** Store only fixed categories and durations. Raw errors, credentials, user
 * fields, headers, URLs and request bodies never enter the emitted record.
 */
export function createAuthDiagnostics(requestId: string, operation: "resolve_session" | "create_session") {
  const started = performance.now();
  const timingsMs: Partial<Record<AuthStage, number>> = {};
  let failure: { category: AuthCategory; stage: AuthStage } | null = null;
  let fallback = false;
  let finished = false;
  return {
    async measure<T>(stage: AuthStage, run: () => T | Promise<T>): Promise<T> {
      const dependencyStarted = performance.now();
      try { return await run(); }
      catch (error) { failure = { category: categoryFor(stage, error), stage }; throw error; }
      finally { timingsMs[stage] = Math.round((performance.now() - dependencyStarted) * 100) / 100; }
    },
    reject(category: AuthCategory, stage: AuthStage) { failure = { category, stage }; },
    unexpectedFailure() { failure ??= { category: "unexpected_failure", stage: "session_completion" }; },
    developmentFallback() { fallback = true; },
    finish(outcome: AuthOutcome) {
      if (finished) return;
      finished = true;
      const durationMs = Math.round((performance.now() - started) * 100) / 100;
      if (!failure && outcome === "authenticated" && process.env.AUTH_DIAGNOSTICS !== "1" && durationMs < 1_000) return;
      const record = {
        requestId, operation, outcome: fallback ? "development_fallback" : outcome,
        category: failure?.category ?? (outcome === "authenticated" ? "authenticated" : "unexpected_failure"),
        stage: failure?.stage ?? null, timingsMs: { ...timingsMs }, durationMs,
      };
      try {
        if (failure || outcome === "denied") console.warn("[auth-diagnostics]", record);
        else console.info("[auth-diagnostics]", record);
      } catch { /* A logging failure must not change authentication behavior. */ }
    },
  };
}

export type AuthDiagnostics = ReturnType<typeof createAuthDiagnostics>;
