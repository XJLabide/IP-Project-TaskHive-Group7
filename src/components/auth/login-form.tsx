"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Info } from "lucide-react";
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { establishServerSession } from "@/lib/auth/client";
import { getFirebaseClientAuth } from "@/lib/auth/firebase-client";
import { describeAuthError } from "@/lib/auth/messages";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";


const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "1";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setPending(true);

    try {
      const credential = await signInWithEmailAndPassword(getFirebaseClientAuth(), email.trim(), password);
      await establishServerSession(credential.user);
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setFormError(describeAuthError(error as { code?: string; message?: string }, "signin"));
      setPending(false);
    }
  }

  async function handleGoogleSignIn() {
    setFormError("");
    setPending(true);
    try {
      const result = await signInWithPopup(getFirebaseClientAuth(), new GoogleAuthProvider());
      await establishServerSession(result.user);
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setFormError(describeAuthError(error as { code?: string; message?: string }, "signin"));
      setPending(false);
    }
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
      <PasswordField
        autoComplete="current-password"
        id="login-password"
        label="Password"
        onChange={setPassword}
        value={password}
      />
      <Link
        className="text-sm text-zinc-600 underline underline-offset-4 transition-colors hover:text-[#D19300] dark:text-zinc-400 dark:hover:text-[#FFC800]"
        href="/forgot-password"
      >
        Forgot password?
      </Link>

      {formError ? (
        <p
          className="rounded-lg border border-[#F04452]/40 bg-[#F04452]/10 p-3 text-sm font-medium text-[#a01a26] dark:text-[#F04452]"
          role="alert"
        >
          {formError}
        </p>
      ) : null}

      <Button className="mt-2" disabled={pending} type="submit">
        {pending ? "Signing in…" : "Sign in"} <ArrowRight className="h-4 w-4" />
      </Button>

      {googleEnabled ? (
        <>
          <div className="my-2 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            or
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          </div>
          <Button
            disabled={pending}
            onClick={() => void handleGoogleSignIn()}
            type="button"
            variant="outline"
          >
            Continue with Google
          </Button>
        </>
      ) : null}

      <Button asChild type="button" variant="outline">
        <Link href="/signup">Create an account</Link>
      </Button>

      <div className="mt-2 flex gap-2 rounded-lg bg-zinc-50 p-3 text-xs leading-5 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D19300] dark:text-[#FFC800]" />
        <p>
          Browsing does not need an account. Signing in is required for posting, applying, chat, and
          private account pages.
        </p>
      </div>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Just looking?{" "}
        <Link
          className="font-semibold text-zinc-950 transition-colors hover:text-[#D19300] dark:text-zinc-100 dark:hover:text-[#FFC800]"
          href="/tasks"
        >
          Browse tasks as a guest
        </Link>
      </p>
    </form>
  );
}
