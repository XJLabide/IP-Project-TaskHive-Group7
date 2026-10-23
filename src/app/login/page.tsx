import Link from "next/link";
import { ArrowRight, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";

const benefits = [
  "Post tasks and apply for work",
  "Message a Poster before applying",
  "Track your verification and appeal state",
];

export default function LoginPage() {
  return (
    <main className="relative grid min-h-screen bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 transition-colors duration-200 lg:grid-cols-2">
      <section className="hidden border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-10 lg:grid lg:content-between transition-colors">
        <Link href="/" className="text-xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
          <span className="text-[#FFC800]">Task</span>Hive
        </Link>
        <div>
          <h1 className="max-w-md text-5xl font-semibold leading-tight tracking-tight dark:text-zinc-50">
            Outsource daily errands or earn nearby.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            One account handles posting, bidding, chatting, payment status, and
            reputation across both roles.
          </p>
        </div>
        <div className="grid gap-3 text-sm text-zinc-700 dark:text-zinc-300">
          {benefits.map((item) => (
            <div className="flex items-center gap-2" key={item}>
              <CheckCircle2 className="h-4 w-4 text-[#D19300] dark:text-[#FFC800]" />
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="grid place-items-center bg-zinc-100 dark:bg-zinc-950 px-6 py-10 transition-colors">
        <div className="w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-sm transition-colors">
          <div className="mb-8">
            <Link className="text-sm font-extrabold text-zinc-950 dark:text-zinc-50 lg:hidden" href="/">
              <span className="text-[#FFC800]">Task</span>Hive
            </Link>
            <h2 className="mt-4 text-3xl font-bold tracking-tight dark:text-zinc-50 lg:mt-0">
              Sign in
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Continue to your tasks, bids, messages, and verification.
            </p>
          </div>

          <form className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium dark:text-zinc-200">
              Email address
              <input autoComplete="email" className={fieldClass} required type="email" />
            </label>
            <PasswordField
              autoComplete="current-password"
              id="login-password"
              label="Password"
            />
            <Link className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-[#D19300] dark:hover:text-[#FFC800] transition-colors underline underline-offset-4" href="/login">
              Forgot password?
            </Link>
            <Button className="mt-2" type="submit">
              Sign in <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            or
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          </div>

          <Button className="w-full" type="button" variant="outline">
            Continue with Google
          </Button>

          <div className="mt-6 flex gap-2 rounded-lg bg-zinc-50 p-3 text-xs leading-5 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D19300] dark:text-[#FFC800]" />
            <p>
              Browsing does not need an account. Signing in is required for posting, applying, chat,
              and private account pages.
            </p>
          </div>

          <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            New to the Hive?{" "}
            <Link className="font-semibold text-zinc-950 dark:text-zinc-100 hover:text-[#D19300] dark:hover:text-[#FFC800] transition-colors" href="/signup">
              Create an account
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Just looking?{" "}
            <Link className="font-semibold text-zinc-950 dark:text-zinc-100 hover:text-[#D19300] dark:hover:text-[#FFC800] transition-colors" href="/tasks">
              Browse tasks as a guest
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
