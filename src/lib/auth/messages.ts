type FirebaseError = { code?: string; message?: string } | null;

export function describeAuthError(error: FirebaseError, flow: "signup" | "signin" | "email"): string {
  const code = error?.code ?? "";

  if (code === "auth/email-already-in-use") return "That email already has an account. Sign in instead.";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "That email and password do not match.";
  }
  if (code === "auth/weak-password" || code === "auth/password-does-not-meet-requirements") {
    return "Choose a stronger password with at least 8 characters.";
  }
  if (code === "auth/invalid-email") return "Enter a valid email address.";
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return "Google sign-in was cancelled.";
  }
  if (code === "auth/popup-blocked") return "Allow pop-ups for this site and try Google sign-in again.";
  if (code === "auth/too-many-requests") return "Too many attempts. Wait a little and try again.";
  if (code === "auth/operation-not-allowed") {
    return "This sign-in method is not enabled for the Firebase project.";
  }
  if (code === "auth/invalid-action-code" || code === "auth/expired-action-code") {
    return "This email link has expired or was already used. Request a new one.";
  }
  if (error?.message?.includes("Firebase Authentication is not configured")) {
    return "Firebase Authentication is not configured for this deployment.";
  }

  if (code === "auth/network-request-failed") return "Could not reach the authentication service. Check your connection and try again.";

  if (flow === "signup") return "We could not create your account. Please try again.";
  if (flow === "signin") return "We could not sign you in. Please try again.";
  return "We could not complete that email request. Please try again.";
}
