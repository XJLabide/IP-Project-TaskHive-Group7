"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { describeAuthError } from "@/lib/auth/messages";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/components/ui/password-field";

export function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

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
    if (!token) {
      setError("This reset link is missing its token. Request a new one.");
      return;
    }

    setPending(true);
    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    if (resetError) {
      setError(describeAuthError(resetError, "signin"));
      setPending(false);
      return;
    }

    router.push("/login");
    router.refresh();
  }

  return (
    <form className="grid gap-4" method="post" onSubmit={handleSubmit}>
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

      {!token ? (
        <p className="rounded-lg bg-[#F04452]/10 p-3 text-sm text-[#a01a26] dark:text-[#F04452]" role="alert">
          This link is missing its token.{" "}
          <Link className="underline" href="/forgot-password">
            Request a new one
          </Link>
          .
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg bg-[#F04452]/10 p-3 text-sm text-[#a01a26] dark:text-[#F04452]" role="alert">
          {error}
        </p>
      ) : null}

      <Button disabled={pending} type="submit">
        {pending ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}
