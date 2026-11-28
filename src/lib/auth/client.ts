"use client";

import {
  getIdToken,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseClientAuth } from "./firebase-client";

export async function establishServerSession(user: FirebaseUser) {
  // Firebase refreshes the token automatically when it is expired or close to
  // expiry. Forcing a refresh here adds a network round trip to every session
  // sync, including the passive auth-state check on page load.
  const idToken = await getIdToken(user);
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  const body = (await response.json().catch(() => null)) as { error?: string } | null;

  if (!response.ok) {
    throw new Error(body?.error ?? "Could not start a secure TaskHive session.");
  }
}

export async function signOutFromTaskHive() {
  const auth = getFirebaseClientAuth();
  const cookieResult = await fetch("/api/auth/session", { method: "DELETE" });
  if (!cookieResult.ok) {
    throw new Error("Could not clear the TaskHive session. Please try again.");
  }
  await firebaseSignOut(auth);
}
