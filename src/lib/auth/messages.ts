type AuthError = { message?: string; status?: number } | null;

/**
 * Turns Better Auth's error into something a participant can act on.
 * The 500 branch covers a missing database on a fresh checkout.
 */
export function describeAuthError(error: AuthError, flow: "signup" | "signin"): string {
  if (!error) return "Something went wrong. Try again.";

  if (error.status === 500) {
    return flow === "signup"
      ? "Accounts are unavailable right now. If this is a fresh setup, set DATABASE_URL and run pnpm prisma:push."
      : "Sign-in is unavailable right now. If this is a fresh setup, set DATABASE_URL and run pnpm prisma:push.";
  }

  if (flow === "signup" && (error.status === 422 || /exist/i.test(error.message ?? ""))) {
    return "That email already has an account. Sign in instead.";
  }

  if (flow === "signin" && error.status === 401) {
    return "That email and password do not match.";
  }

  return error.message ?? "Something went wrong. Try again.";
}
