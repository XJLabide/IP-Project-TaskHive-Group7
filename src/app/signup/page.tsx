import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import { HelpTip } from "@/components/ui/help-tip";
import { PasswordField } from "@/components/ui/password-field";

const promises = [
  "One account for posting and tasking",
  "Verified email and phone before you act",
  "18+ marketplace, no identity documents in TaskHive",
];

export default function SignupPage() {
  return (
    <main className="relative grid min-h-screen bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 transition-colors duration-200 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="hidden border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-10 lg:grid lg:content-between transition-colors">
        <Link href="/" className="text-xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
          <span className="text-[#FFC800]">Task</span>Hive
        </Link>
        <div>
          <h1 className="max-w-md text-5xl font-semibold leading-tight tracking-tight dark:text-zinc-50">
            Build one profile for posting and tasking.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Guests can browse. An account with a verified email, a verified phone, and an 18+
            attestation unlocks posting, applying, and chat.
          </p>
        </div>
        <div className="grid gap-3 text-sm text-zinc-700 dark:text-zinc-300">
          {promises.map((item) => (
            <div className="flex items-center gap-2" key={item}>
              <CheckCircle2 className="h-4 w-4 text-[#D19300] dark:text-[#FFC800]" />
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="grid place-items-center bg-zinc-100 dark:bg-zinc-950 px-6 py-10 transition-colors">
        <div className="w-full max-w-2xl rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-sm transition-colors">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link className="text-sm font-extrabold text-zinc-950 dark:text-zinc-50 lg:hidden" href="/">
                <span className="text-[#FFC800]">Task</span>Hive
              </Link>
              <h2 className="mt-4 text-3xl font-bold tracking-tight dark:text-zinc-50 lg:mt-0">
                Create your account
              </h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Start with the basics. You can add location, skills, and portfolio later.
              </p>
            </div>
            <Link className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-[#D19300] dark:hover:text-[#FFC800] transition-colors" href="/login">
              Log in
            </Link>
          </div>

          <form className="grid gap-6">
            <p className="rounded-lg bg-zinc-100 p-3 text-xs leading-5 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
              Prototype note: account creation is not connected in this build. These fields show
              the required steps and states; nothing is submitted.
            </p>
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#D19300] dark:text-[#FFC800]">
                1. Account
              </legend>
              <label className="grid content-start gap-2 text-sm font-medium dark:text-zinc-200">
                Full name
                <input autoComplete="name" className={fieldClass} required />
              </label>
              <label className="grid content-start gap-2 text-sm font-medium dark:text-zinc-200">
                <span className="flex items-center gap-1.5">
                  Phone number
                  <HelpTip id="phone-help" label="Why we verify your phone">
                    We text a six-digit code. Verified phone is required before posting or
                    applying.
                  </HelpTip>
                </span>
                <input autoComplete="tel" className={fieldClass} inputMode="tel" required />
              </label>
              <label className="grid content-start gap-2 text-sm font-medium dark:text-zinc-200 sm:col-span-2">
                Email address
                <input autoComplete="email" className={fieldClass} required type="email" />
                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                  We email a confirmation link. Verified email is required before posting or applying.
                </span>
              </label>
              <PasswordField
                autoComplete="new-password"
                id="signup-password"
                label="Password"
                minLength={8}
              />
              <PasswordField
                autoComplete="new-password"
                id="signup-confirm-password"
                label="Confirm password"
                minLength={8}
              />
            </fieldset>

            <fieldset className="grid gap-3">
              <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#D19300] dark:text-[#FFC800]">
                2. Age attestation
              </legend>
              <label className="flex items-start gap-3 rounded-lg border border-zinc-300 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-950">
                <input className="mt-1" required type="checkbox" />
                <span className="text-zinc-700 dark:text-zinc-300">
                  I confirm that I am 18 years of age or older.
                  <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                    TaskHive is an adults-only marketplace. This attestation gates posting and
                    applying for every account.
                  </span>
                </span>
              </label>
            </fieldset>

            <fieldset className="grid gap-3">
              <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#D19300] dark:text-[#FFC800]">
                3. Marketplace agreement
              </legend>
              <label className="flex items-start gap-3 rounded-lg border border-zinc-300 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-950">
                <input className="mt-1" required type="checkbox" />
                <span className="text-zinc-700 dark:text-zinc-300">
                  I agree to the TaskHive terms, marketplace rules, and safety policies.
                </span>
              </label>
              <div className="flex gap-3 rounded-lg bg-[#FFD50D]/15 p-4 text-sm leading-6 text-zinc-700 dark:bg-[#FFC800]/10 dark:text-zinc-300">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#D19300] dark:text-[#FFC800]" />
                <p>
                  TaskHive never asks for identity documents. When you want to be assigned work, a
                  verification provider checks your identity and keeps the documents; TaskHive
                  stores only the result and a provider reference.
                </p>
              </div>
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="submit">
                Create account <ArrowRight className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline">
                Continue with Google
              </Button>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Already have an account?{" "}
              <Link className="font-semibold text-[#D19300] underline underline-offset-4 dark:text-[#FFC800]" href="/login">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
