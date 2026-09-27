import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-white text-zinc-950 lg:grid-cols-2">
      <section className="hidden border-r border-zinc-200 bg-zinc-100 p-10 lg:grid lg:content-between">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          TaskHive
        </Link>
        <div>
          <h1 className="max-w-md text-5xl font-semibold leading-tight tracking-tight">
            Outsource daily errands or earn nearby.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-zinc-600">
            One account handles posting, bidding, chatting, payment status, and
            reputation across both roles.
          </p>
        </div>
        <div className="grid gap-3 text-sm text-zinc-700">
          {["Verified profile flow", "Chat before hiring", "Two-way reviews"].map((item) => (
            <div className="flex items-center gap-2" key={item}>
              <CheckCircle2 className="h-4 w-4" />
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="grid place-items-center bg-zinc-950 px-6 py-10">
        <div className="w-full max-w-md rounded-lg bg-zinc-100 p-8">
          <div className="mb-8">
            <Link className="text-sm font-medium text-zinc-600 lg:hidden" href="/">
              TaskHive
            </Link>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight lg:mt-0">
              Welcome back
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Continue to your tasks, bids, messages, and payment records.
            </p>
          </div>

          <form className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium">
              Email address
              <input
                className="h-11 rounded-lg border border-zinc-300 bg-white px-3 font-normal outline-none focus:border-zinc-600"
                type="email"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Password
              <input
                className="h-11 rounded-lg border border-zinc-300 bg-white px-3 font-normal outline-none focus:border-zinc-600"
                type="password"
              />
            </label>
            <Link className="text-sm text-zinc-600 underline underline-offset-4" href="/login">
              Forgot password?
            </Link>
            <Button asChild>
              <Link href="/dashboard">
                Log in <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-zinc-500">
            <div className="h-px flex-1 bg-zinc-300" />
            or
            <div className="h-px flex-1 bg-zinc-300" />
          </div>

          <Button className="w-full" type="button" variant="outline">
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-sm text-zinc-600">
            New to the Hive?{" "}
            <Link className="font-semibold text-zinc-950" href="/signup">
              Create an account
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
