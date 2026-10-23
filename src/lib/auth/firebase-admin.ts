import "server-only";

import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import type { ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getFirebaseAdminApp() {
  const existingApp = getApps()[0];
  if (existingApp) return existingApp;

  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const serviceAccountValue = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (emulatorHost) {
    if (!projectId) throw new Error("FIREBASE_PROJECT_ID is required for the Firebase Auth emulator.");
    return initializeApp({ projectId });
  }

  if (serviceAccountValue) {
    const parsed = JSON.parse(serviceAccountValue) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT is missing project_id, client_email, or private_key.");
    }
    const serviceAccount: ServiceAccount = {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key,
    };

    return initializeApp({
      credential: cert(serviceAccount),
      projectId: projectId ?? serviceAccount.projectId,
    });
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_PROJECT) {
    return initializeApp({ credential: applicationDefault(), projectId });
  }

  throw new Error("Firebase Admin credentials are not configured.");
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}
