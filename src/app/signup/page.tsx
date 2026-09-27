import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  return (
    <main className="grid min-h-screen bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 transition-colors duration-200 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="hidden border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-10 lg:grid lg:content-between transition-colors">
        <Link href="/" className="text-xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
          <span className="text-[#FFC800]">Task</span>Hive
        </Link>
        <div>
          <h1 className="max-w-md text-5xl font-semibold leading-tight tracking-tight dark:text-zinc-50">
            Build one profile for posting and tasking.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Start with account details, then complete identity, location,
            skills, and portfolio setup before marketplace use.
          </p>
        </div>
        <div className="grid gap-3 text-sm text-zinc-700 dark:text-zinc-300">
          {[
            "Poster and Tasker in one account",
            "Phone and location fields",
            "Google sign up ready",
          ].map((item) => (
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
                Use one account to post tasks, apply for work, and build reputation.
              </p>
            </div>
            <Link className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-[#D19300] dark:hover:text-[#FFC800] transition-colors" href="/login">
              Log in
            </Link>
          </div>

          <form className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium dark:text-zinc-200">
              Full name
              <input className="h-11 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 font-normal dark:text-zinc-50 outline-none focus:border-[#FFC800] dark:focus:border-[#FFC800] transition-colors" />
            </label>
            <label className="grid gap-2 text-sm font-medium dark:text-zinc-200">
              Phone number
              <input className="h-11 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 font-normal dark:text-zinc-50 outline-none focus:border-[#FFC800] dark:focus:border-[#FFC800] transition-colors" />
            </label>
            <label className="grid gap-2 text-sm font-medium dark:text-zinc-200 sm:col-span-2">
              Email address
              <input
                className="h-11 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 font-normal dark:text-zinc-50 outline-none focus:border-[#FFC800] dark:focus:border-[#FFC800] transition-colors"
                type="email"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium dark:text-zinc-200">
              Password
              <input
                className="h-11 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 font-normal dark:text-zinc-50 outline-none focus:border-[#FFC800] dark:focus:border-[#FFC800] transition-colors"
                type="password"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium dark:text-zinc-200">
              Confirm password
              <input
                className="h-11 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 font-normal dark:text-zinc-50 outline-none focus:border-[#FFC800] dark:focus:border-[#FFC800] transition-colors"
                type="password"
              />
            </label>
            <div className="grid gap-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 p-4 text-sm sm:col-span-2 transition-colors">
              <label className="flex items-start gap-3">
                <input className="mt-1" defaultChecked type="checkbox" />
                <span className="text-zinc-700 dark:text-zinc-300">
                  I agree to TaskHive terms, marketplace rules, and safety policies.
                </span>
              </label>
            </div>
            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
              <Button type="button">
                Create account <ArrowRight className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline">
                Continue with Google
              </Button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}