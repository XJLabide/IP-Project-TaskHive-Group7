import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

const benefits = [
  "Post tasks and apply for work",
  "Message a Poster before applying",
  "Manage your profile and 18+ confirmation",
];

export default function LoginPage() {
  return (
    <main className="relative grid min-h-screen bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 transition-colors duration-200 lg:h-dvh lg:min-h-0 lg:grid-cols-2 lg:overflow-hidden">
      <section className="hidden border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-10 lg:grid lg:h-dvh lg:content-between lg:overflow-y-auto transition-colors">
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

      <section className="bg-zinc-100 dark:bg-zinc-950 transition-colors lg:h-dvh lg:overflow-y-auto lg:overscroll-contain">
        <div className="grid min-h-full place-items-center px-6 py-10">
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

            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}
