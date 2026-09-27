import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 transition-colors duration-200 lg:grid-cols-2">
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
          {["Verified profile flow", "Chat before hiring", "Two-way reviews"].map((item) => (
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
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Continue to your tasks, bids, messages, and payment records.
            </p>
          </div>

          <form className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium dark:text-zinc-200">
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
            <Link className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-[#D19300] dark:hover:text-[#FFC800] transition-colors underline underline-offset-4" href="/login">
              Forgot password?
            </Link>
            <Button asChild className="mt-2">
              <Link href="/dashboard">
                Log in <ArrowRight className="h-4 w-4" />
              </Link>
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

          <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            New to the Hive?{" "}
            <Link className="font-semibold text-zinc-950 dark:text-zinc-100 hover:text-[#D19300] dark:hover:text-[#FFC800] transition-colors" href="/signup">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}