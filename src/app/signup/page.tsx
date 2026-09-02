import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  return (
    <main className="grid min-h-screen bg-white text-zinc-950 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="hidden border-r border-zinc-200 bg-zinc-100 p-10 lg:grid lg:content-between">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          TaskHive
        </Link>
        <div>
          <h1 className="max-w-md text-5xl font-semibold leading-tight tracking-tight">
            Build one profile for posting and tasking.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-zinc-600">
            Start with account details, then complete identity, location,
            skills, and portfolio setup before marketplace use.
          </p>
        </div>
        <div className="grid gap-3 text-sm text-zinc-700">
          {[
            "Poster and Tasker in one account",
            "Phone and location fields",
            "Google sign up ready",
          ].map((item) => (
            <div className="flex items-center gap-2" key={item}>
              <CheckCircle2 className="h-4 w-4" />
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="grid place-items-center bg-zinc-950 px-6 py-10">
        <div className="w-full max-w-2xl rounded-lg bg-zinc-100 p-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link className="text-sm font-medium text-zinc-600 lg:hidden" href="/">
                TaskHive
              </Link>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight lg:mt-0">
                Create your account
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                Use one account to post tasks, apply for work, and build reputation.
              </p>
            </div>
            <Link className="text-sm font-medium text-zinc-600 hover:text-zinc-950" href="/login">
              Log in
            </Link>
          </div>

          <form className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Full name
              <input className="h-11 rounded-lg border border-zinc-300 bg-white px-3 font-normal outline-none focus:border-zinc-600" />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Phone number
              <input className="h-11 rounded-lg border border-zinc-300 bg-white px-3 font-normal outline-none focus:border-zinc-600" />
            </label>
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">
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
            <label className="grid gap-2 text-sm font-medium">
              Confirm password
              <input
                className="h-11 rounded-lg border border-zinc-300 bg-white px-3 font-normal outline-none focus:border-zinc-600"
                type="password"
              />
            </label>
            <div className="grid gap-3 rounded-lg border border-zinc-300 bg-white p-4 text-sm sm:col-span-2">
              <label className="flex items-start gap-3">
                <input className="mt-1" defaultChecked type="checkbox" />
                <span>I agree to TaskHive terms, marketplace rules, and safety policies.</span>
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
