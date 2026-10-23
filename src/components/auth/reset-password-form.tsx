"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { describeAuthError } from "@/lib/auth/messages";
import { getFirebaseClientAuth, isFirebaseClientConfigured } from "@/lib/auth/firebase-client";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/password-field";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const actionCodeFromUrl = searchParams.get("oobCode") ?? "";
  const actionCode = actionCodeFromUrl;
  const [linkReady, setLinkReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!actionCodeFromUrl || !isFirebaseClientConfigured()) return;

    window.history.replaceState(null, "", window.location.pathname);

    void verifyPasswordResetCode(getFirebaseClientAuth(), actionCodeFromUrl)
      .then(() => setLinkReady(true))
      .catch((verificationError: unknown) => {
        setError(describeAuthError(verificationError as { code?: string; message?: string }, "email"));
      });
  }, [actionCodeFromUrl]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!actionCode || !linkReady) {
      setError("This reset link is invalid or expired. Request a new one.");
      return;
    }

    setPending(true);
    try {
      await confirmPasswordReset(getFirebaseClientAuth(), actionCode, password);
      router.replace("/login?reset=complete");
      router.refresh();
    } catch (resetError) {
      setError(describeAuthError(resetError as { code?: string; message?: string }, "email"));
      setPending(false);
    }
  }

  if (!isFirebaseClientConfigured()) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Firebase Authentication is not configured for this deployment.</p>;
  }

  if (!actionCode && !error) {
    return (
      <div className="grid gap-4">
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Open the reset email to choose a new password. If the link has expired, request another.
        </p>
        <Button asChild variant="outline">
          <Link href="/forgot-password">Request another reset link</Link>
        </Button>
      </div>
    );
  }

  return (
    <form className="grid gap-4" method="post" onSubmit={handleSubmit}>
      {linkReady ? (
        <>
          <PasswordField
            autoComplete="new-password"
            id="reset-password"
            label="New password"
            minLength={8}
            onChange={setPassword}
            value={password}
          />
          <PasswordField
            autoComplete="new-password"
            id="reset-confirm-password"
            label="Confirm new password"
            minLength={8}
            onChange={setConfirm}
            value={confirm}
          />
          <Button disabled={pending} type="submit">
            {pending ? "Saving…" : "Set new password"}
          </Button>
        </>
      ) : !error ? (
        <p className="text-sm text-zinc-500" role="status">Checking your reset link…</p>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-[#F04452]/10 p-3 text-sm text-[#a01a26] dark:text-[#F04452]" role="alert">
          {error} <Link className="underline" href="/forgot-password">Request a new link</Link>.
        </p>
      ) : null}
    </form>
  );
}
