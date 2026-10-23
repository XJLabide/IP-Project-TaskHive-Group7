"use client";

import { useState, type FormEvent } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { getFirebaseClientAuth } from "@/lib/auth/firebase-client";
import { describeAuthError } from "@/lib/auth/messages";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      await sendPasswordResetEmail(getFirebaseClientAuth(), email.trim(), {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      });
      setSent(true);
    } catch (sendError) {
      const code = (sendError as { code?: string }).code;
      if (code === "auth/user-not-found" || code === "auth/invalid-email") {
        // Keep account existence private.
        setSent(true);
      } else {
        setError(describeAuthError(sendError as { code?: string; message?: string }, "email"));
      }
    }

    setPending(false);
  }

  if (sent) {
    return (
      <div className="grid gap-3" role="status">
        <p className="rounded-lg bg-[#75D333]/15 p-3 text-sm text-zinc-700 dark:text-zinc-200">
          If <strong>{email}</strong> has an account, a reset link is on its way. It expires in one
          hour.
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Follow Firebase’s secure password reset page, then sign in with your new password.</p>
      </div>
    );
  }

  return (
    <form className="grid gap-4" method="post" onSubmit={handleSubmit}>
      <label className="grid content-start gap-2 text-sm font-medium dark:text-zinc-200">
        Email address
        <input
          autoComplete="email"
          className={fieldClass}
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>

      {error ? (
        <p className="rounded-lg bg-[#F04452]/10 p-3 text-sm text-[#a01a26] dark:text-[#F04452]" role="alert">
          {error}
        </p>
      ) : null}

      <Button disabled={pending} type="submit">
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
