"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { createUserWithEmailAndPassword, GoogleAuthProvider, sendEmailVerification, signInWithPopup, updateProfile } from "firebase/auth";
import { establishServerSession } from "@/lib/auth/client";
import { getFirebaseClientAuth } from "@/lib/auth/firebase-client";
import { describeAuthError } from "@/lib/auth/messages";
import { validateSignup, type SignupErrors } from "@/lib/auth/signup-validation";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import { HelpTip } from "@/components/ui/help-tip";
import { PasswordField } from "@/components/ui/password-field";

const initial = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  ageAttested: false,
  acceptedTerms: false,
};


const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH === "1";

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [serverSessionReady, setServerSessionReady] = useState(false);

  function update<Key extends keyof typeof initial>(key: Key, value: (typeof initial)[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const nextErrors = validateSignup(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPending(true);

    let created = false;
    try {
      const auth = getFirebaseClientAuth();
      const credential = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      created = true;
      setAccountCreated(true);
      await updateProfile(credential.user, { displayName: form.name.trim() });
      await establishServerSession(credential.user);
      setServerSessionReady(true);

      const profileResponse = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: form.phone.trim(), ageAttested: true }),
      });
      if (!profileResponse.ok) {
        throw new Error("Your account was created, but profile setup did not finish. Complete it on your profile page.");
      }

      await sendEmailVerification(credential.user, {
        url: `${window.location.origin}/profile`,
        handleCodeInApp: false,
      });

      router.push("/profile");
      router.refresh();
    } catch (error) {
      setFormError(
        created
          ? "Your account was created, but setup did not finish. Continue to your profile to retry setup or resend verification."
          : describeAuthError(error as { code?: string; message?: string }, "signup"),
      );
      setPending(false);
    }
  }

  async function handleGoogleSignUp() {
    setFormError("");
    if (!form.ageAttested || !form.acceptedTerms) {
      setFormError("Confirm the age attestation and marketplace agreement before continuing with Google.");
      return;
    }
    setPending(true);
    try {
      const result = await signInWithPopup(getFirebaseClientAuth(), new GoogleAuthProvider());
      await establishServerSession(result.user);
      setServerSessionReady(true);
      const profileResponse = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: form.phone.trim(), ageAttested: true }),
      });
      if (!profileResponse.ok) throw new Error("Profile setup did not finish.");
      router.push("/profile");
      router.refresh();
    } catch (error) {
      setFormError(describeAuthError(error as { code?: string; message?: string }, "signup"));
      setPending(false);
    }
  }

  if (accountCreated) {
    return (
      <div className="grid gap-4">
        <p className="rounded-lg bg-[#75D333]/15 p-3 text-sm leading-6 text-zinc-700 dark:text-zinc-200" role="status">
          {formError || "Your account is ready. Check your email to verify it before posting or applying."}
        </p>
        <Button asChild>
          <Link href={serverSessionReady ? "/profile" : "/login"}>
            {serverSessionReady ? "Continue to profile" : "Continue to sign in"}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <form className="grid gap-6" method="post" onSubmit={handleSubmit}>
      <p className="rounded-lg bg-zinc-100 p-3 text-xs leading-5 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
        Create an account with your email. Phone verification and the 18+ attestation unlock
        posting and applying; identity verification comes later.
      </p>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#D19300] dark:text-[#FFC800]">
          1. Account
        </legend>
        <label className="grid content-start gap-2 text-sm font-medium dark:text-zinc-200">
          Full name
          <input
            aria-describedby={errors.name ? "signup-name-error" : undefined}
            aria-invalid={errors.name ? true : undefined}
            autoComplete="name"
            className={fieldClass}
            onChange={(event) => update("name", event.target.value)}
            required
            value={form.name}
          />
          {errors.name ? (
            <span className="text-xs font-medium text-[#a01a26] dark:text-[#F04452]" id="signup-name-error">
              {errors.name}
            </span>
          ) : null}
        </label>
        <label className="grid content-start gap-2 text-sm font-medium dark:text-zinc-200">
          <span className="flex items-center gap-1.5">
            Phone number (optional)
            <HelpTip id="phone-help" label="Why we ask for a phone number">
              Used for task coordination only. TaskHive does not require phone verification.
            </HelpTip>
          </span>
          <input
            aria-describedby={errors.phone ? "signup-phone-error" : undefined}
            aria-invalid={errors.phone ? true : undefined}
            autoComplete="tel"
            className={fieldClass}
            inputMode="tel"
            onChange={(event) => update("phone", event.target.value)}
            value={form.phone}
          />
          {errors.phone ? (
            <span className="text-xs font-medium text-[#a01a26] dark:text-[#F04452]" id="signup-phone-error">
              {errors.phone}
            </span>
          ) : null}
        </label>
        <label className="grid content-start gap-2 text-sm font-medium dark:text-zinc-200 sm:col-span-2">
          Email address
          <input
            aria-describedby={errors.email ? "signup-email-error" : undefined}
            aria-invalid={errors.email ? true : undefined}
            autoComplete="email"
            className={fieldClass}
            onChange={(event) => update("email", event.target.value)}
            required
            type="email"
            value={form.email}
          />
          {errors.email ? (
            <span className="text-xs font-medium text-[#a01a26] dark:text-[#F04452]" id="signup-email-error">
              {errors.email}
            </span>
          ) : (
            <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
              We email a confirmation link. Verified email is required before posting or applying.
            </span>
          )}
        </label>
        <PasswordField
          autoComplete="new-password"
          error={errors.password}
          id="signup-password"
          label="Password"
          minLength={8}
          onChange={(value) => update("password", value)}
          value={form.password}
        />
        <PasswordField
          autoComplete="new-password"
          error={errors.confirmPassword}
          id="signup-confirm-password"
          label="Confirm password"
          minLength={8}
          onChange={(value) => update("confirmPassword", value)}
          value={form.confirmPassword}
        />
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#D19300] dark:text-[#FFC800]">
          2. Age attestation
        </legend>
        <label className="flex items-start gap-3 rounded-lg border border-zinc-300 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-950">
          <input
            checked={form.ageAttested}
            className="mt-1"
            onChange={(event) => update("ageAttested", event.target.checked)}
            required
            type="checkbox"
          />
          <span className="text-zinc-700 dark:text-zinc-300">
            I confirm that I am 18 years of age or older.
            <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
              TaskHive is an adults-only marketplace. This attestation gates posting and applying
              for every account.
            </span>
          </span>
        </label>
        {errors.ageAttested ? (
          <p className="text-xs font-medium text-[#a01a26] dark:text-[#F04452]" role="alert">
            {errors.ageAttested}
          </p>
        ) : null}
      </fieldset>

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#D19300] dark:text-[#FFC800]">
          3. Marketplace agreement
        </legend>
        <label className="flex items-start gap-3 rounded-lg border border-zinc-300 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-950">
          <input
            checked={form.acceptedTerms}
            className="mt-1"
            onChange={(event) => update("acceptedTerms", event.target.checked)}
            required
            type="checkbox"
          />
          <span className="text-zinc-700 dark:text-zinc-300">
            I agree to the TaskHive terms, marketplace rules, and safety policies.
          </span>
        </label>
        {errors.acceptedTerms ? (
          <p className="text-xs font-medium text-[#a01a26] dark:text-[#F04452]" role="alert">
            {errors.acceptedTerms}
          </p>
        ) : null}
        <div className="flex gap-3 rounded-lg bg-[#FFD50D]/15 p-4 text-sm leading-6 text-zinc-700 dark:bg-[#FFC800]/10 dark:text-zinc-300">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#D19300] dark:text-[#FFC800]" />
          <p>
            TaskHive never asks for identity documents. When you want to be assigned work, a
            verification provider checks your identity and keeps the documents; TaskHive stores only
            the result and a provider reference.
          </p>
        </div>
      </fieldset>

      {formError ? (
        <p
          className="rounded-lg border border-[#F04452]/40 bg-[#F04452]/10 p-3 text-sm font-medium text-[#a01a26] dark:text-[#F04452]"
          role="alert"
        >
          {formError}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Button disabled={pending} type="submit">
          {pending ? "Creating account…" : "Create account"} <ArrowRight className="h-4 w-4" />
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href="/login">I already have an account</Link>
        </Button>
      </div>

      {googleEnabled ? (
        <Button
          disabled={pending}
          onClick={() => void handleGoogleSignUp()}
          type="button"
          variant="outline"
        >
          Continue with Google
        </Button>
      ) : null}
    </form>
  );
}
