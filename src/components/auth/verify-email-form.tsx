"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { applyActionCode, onAuthStateChanged, reload, sendEmailVerification, type User } from "firebase/auth";
import { establishServerSession } from "@/lib/auth/client";
import { getFirebaseClientAuth, isFirebaseClientConfigured } from "@/lib/auth/firebase-client";
import { describeAuthError } from "@/lib/auth/messages";
import { Button } from "@/components/ui/button";

export function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  const actionCodeFromUrl = searchParams.get("oobCode") ?? "";
  const [user, setUser] = useState<User | null>(null);
  const [pending, setPending] = useState(Boolean(actionCodeFromUrl));
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isFirebaseClientConfigured()) return;
    const auth = getFirebaseClientAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isFirebaseClientConfigured()) return;
    if (mode !== "verifyEmail" || !actionCodeFromUrl) return;

    window.history.replaceState(null, "", window.location.pathname);
    let active = true;

    void applyActionCode(getFirebaseClientAuth(), actionCodeFromUrl)
      .then(async () => {
        const currentUser = getFirebaseClientAuth().currentUser;
        if (currentUser) {
          await reload(currentUser);
          await establishServerSession(currentUser);
        }
        if (!active) return;
        setPending(false);
        setVerified(true);
        if (currentUser) {
          router.replace("/profile");
          router.refresh();
        }
      })
      .catch((verificationError: unknown) => {
        if (!active) return;
        setPending(false);
        setError(describeAuthError(verificationError as { code?: string; message?: string }, "email"));
      });

    return () => {
      active = false;
    };
  }, [actionCodeFromUrl, mode, router]);

  async function handleResend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!user) {
      setError("Sign in to resend the verification email.");
      return;
    }

    setPending(true);
    try {
      await sendEmailVerification(user, {
        url: `${window.location.origin}/profile`,
        handleCodeInApp: false,
      });
      setSent(true);
    } catch (sendError) {
      setError(describeAuthError(sendError as { code?: string; message?: string }, "email"));
    } finally {
      setPending(false);
    }
  }

  if (!isFirebaseClientConfigured()) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Firebase Authentication is not configured for this deployment.</p>;
  }

  if (verified) {
    return (
      <div className="grid gap-3" role="status">
        <p className="rounded-lg bg-[#75D333]/15 p-3 text-sm text-zinc-700 dark:text-zinc-200">
          Your email is verified. {user ? "Your profile is ready." : "Sign in to continue to your profile."}
        </p>
        <Button asChild>
          <Link href={user ? "/profile" : "/login"}>{user ? "Go to profile" : "Sign in"}</Link>
        </Button>
      </div>
    );
  }

  if (pending && actionCodeFromUrl) {
    return <p className="text-sm text-zinc-500" role="status">Verifying your email…</p>;
  }

  if (!user) {
    return (
      <div className="grid gap-3">
        {error ? <p className="rounded-lg bg-[#F04452]/10 p-3 text-sm text-[#a01a26] dark:text-[#F04452]" role="alert">{error}</p> : null}
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Sign in first, then resend the verification email from this page.</p>
        <Button asChild><Link href="/login">Sign in</Link></Button>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="grid gap-3" role="status">
        <p className="rounded-lg bg-[#75D333]/15 p-3 text-sm text-zinc-700 dark:text-zinc-200">
          Verification link sent to <strong>{user.email}</strong>. Open it to verify your address.
        </p>
        <Button onClick={() => setSent(false)} type="button" variant="outline">Send again</Button>
      </div>
    );
  }

  return (
    <form className="grid gap-4" method="post" onSubmit={handleResend}>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">Send a new verification link to <strong>{user.email}</strong>.</p>
      {error ? <p className="rounded-lg bg-[#F04452]/10 p-3 text-sm text-[#a01a26] dark:text-[#F04452]" role="alert">{error}</p> : null}
      <Button disabled={pending} type="submit">{pending ? "Sending…" : "Send verification link"}</Button>
    </form>
  );
}
