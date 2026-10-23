"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import { describeAuthError } from "@/lib/auth/messages";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";

export function VerifyEmailForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const { error: sendError } = await authClient.sendVerificationEmail({
      email: email.trim(),
      callbackURL: "/profile",
    });

    if (sendError) {
      setError(describeAuthError(sendError, "signup"));
    } else {
      setSent(true);
    }

    setPending(false);
  }

  if (sent) {
    return (
      <div className="grid gap-3" role="status">
        <p className="rounded-lg bg-[#75D333]/15 p-3 text-sm text-zinc-700 dark:text-zinc-200">
          Verification link sent to <strong>{email}</strong>. Open it on this device to verify the
          address.
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Local development without <code>RESEND_API_KEY</code>? The link is printed in the server
          console.
        </p>
        <Button onClick={() => setSent(false)} type="button" variant="outline">
          Send again
        </Button>
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
        {pending ? "Sending…" : "Send verification link"}
      </Button>
    </form>
  );
}
