"use client";

import {
  getIdToken,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { getFirebaseClientAuth } from "./firebase-client";

export async function establishServerSession(user: FirebaseUser) {
  const idToken = await getIdToken(user, true);
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
