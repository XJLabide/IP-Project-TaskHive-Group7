import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, MapPin, ShieldCheck, Star } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "01",
    title: "Post a task",
    text: "Describe what you need, where you need it, and the budget you have in mind.",
  },
  {
    number: "02",
    title: "Choose your Tasker",
    text: "Compare offers from people nearby, check their profiles, and chat before you hire.",
  },
  {
    number: "03",
    title: "Get it done",
    text: "Pay securely after hiring and confirm the task when the work is complete.",
  },
];

const categories = ["Groceries & errands", "Home repairs", "Cleaning", "Delivery", "Moving help", "Tutoring"];

const questions = [
  ["How does TaskHive work?", "Post a task, review offers from local Taskers, and hire the person who suits your needs."],
  ["When do I pay for a task?", "You pay after choosing a Tasker. Payment is recorded while the task is underway and released after completion is confirmed."],
  ["Can I talk to a Tasker before hiring?", "Yes. Use chat to clarify the task details, timing, and expectations before you decide."],
  ["How do I earn as a Tasker?", "Create a profile, browse tasks in your area, and send an offer for work you can complete."],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-zinc-950 transition-colors duration-200 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/75 text-zinc-950 backdrop-blur-md shadow-[0_1px_0_rgba(24,24,27,0.06)] dark:border-zinc-800/80 dark:bg-zinc-950/75 dark:text-zinc-50">
        <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4 md:px-8 lg:px-12">
          <Link href="/" className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
            <span className="text-yellow-500">Task</span>Hive
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
            <Link href="/tasks" className="text-zinc-700 transition-colors hover:text-yellow-500 dark:text-zinc-300 dark:hover:text-yellow-300">Categories</Link>
          </nav>
          <div className="flex items-center gap-3 text-sm font-semibold md:gap-4">
            <Link className="text-zinc-700 transition-colors hover:text-yellow-500 dark:text-zinc-300 dark:hover:text-yellow-300" href="/login">Log in</Link>
            <Link className="text-zinc-700 transition-colors hover:text-yellow-500 dark:text-zinc-300 dark:hover:text-yellow-300" href="/signup">Sign up</Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section>
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-[1600px] items-center gap-10 px-4 py-10 md:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:px-12">
          <div className="max-w-xl">
            <h1 className="text-[3.2rem] font-light leading-[0.98] tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-[4.5rem] lg:text-[5.2rem]">
              CAN YOUR <span className="font-semibold">TASKS</span> GET DONE?
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-zinc-600 dark:text-zinc-300 lg:text-lg">
              When digital tools fall short, TaskHive brings real help to your doorstep. Post a task, pick a hero, and get it done.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button asChild className="min-w-52" size="lg"><Link href="/tasks/new">Post a Task</Link></Button>
              <Button asChild className="min-w-56" size="lg" variant="outline"><Link href="/tasks">Become a Tasker</Link></Button>
            </div>
          </div>

          <div aria-label="Illustration placeholder" className="relative w-full min-h-[320px] overflow-hidden bg-zinc-200 dark:bg-zinc-900 lg:min-h-[480px]">
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-medium text-zinc-600 dark:text-zinc-300">Local help, right around the corner</span>
            <span className="absolute inset-0 overflow-hidden" aria-hidden="true">
              <span className="absolute left-1/2 top-1/2 h-[140%] w-px origin-center -translate-x-1/2 -translate-y-1/2 rotate-[52deg] bg-black dark:bg-white" />
              <span className="absolute left-1/2 top-1/2 h-[140%] w-px origin-center -translate-x-1/2 -translate-y-1/2 -rotate-[52deg] bg-black dark:bg-white" />
            </span>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24">
        <div className="mx-auto w-full max-w-[1600px] px-4 md:px-8 lg:px-12">
          <h2 className="text-center text-4xl font-light tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-[50px]"><strong className="font-bold">3</strong> Steps. <strong className="font-bold">Zero</strong> Hassle.</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-[1.4fr_1fr_0.9fr]">
            {steps.map((step) => (
              <article className="min-h-[250px] bg-zinc-100 p-7 sm:p-9 dark:bg-zinc-900" key={step.number}>
                <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">{step.number}</p>
                <h3 className="mt-10 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{step.title}</h3>
                <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-700 dark:text-zinc-300">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24">
        <div className="mx-auto w-full max-w-[1600px] px-4 md:px-8 lg:px-12">
          <h2 className="text-center text-3xl font-light tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-[42px]">What Can We Help You Cross Off Today?</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link className="flex min-h-[50px] items-center justify-between bg-zinc-100 px-5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800" href="/tasks" key={category}>
                {category}<ArrowRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24">
        <div className="mx-auto w-full max-w-[1600px] px-4 md:px-8 lg:px-12">
          <h2 className="text-center text-3xl font-light tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-[42px]">Got <strong className="font-bold">Questions</strong>? We’ve Got <strong className="font-bold">Answers</strong></h2>
          <div className="mx-auto mt-12 max-w-4xl">
            {questions.map(([question, answer]) => (
              <details className="group border-b border-zinc-200 py-5 last:border-b-0 dark:border-zinc-700" key={question}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-zinc-950 dark:text-zinc-50 marker:hidden">
                  {question}<span aria-hidden="true" className="text-xl text-zinc-500 group-open:rotate-45 dark:text-zinc-400">+</span>
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-300">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24">
        <div className="mx-auto grid w-full max-w-[1600px] items-center gap-9 px-4 md:px-8 lg:grid-cols-[0.9fr_2.1fr] lg:px-12">
          <div>
            <h2 className="text-4xl font-light tracking-tight text-zinc-950 dark:text-zinc-50">Why <strong className="font-bold">TaskHive</strong>?</h2>
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">Built for local trust.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <article className="min-h-[210px] bg-zinc-100 p-6 dark:bg-zinc-900">
              <ShieldCheck className="h-7 w-7 text-zinc-950 dark:text-zinc-50" /><h3 className="mt-8 font-semibold text-zinc-950 dark:text-zinc-50">Profiles you can trust</h3><p className="mt-2 text-sm leading-5 text-zinc-700 dark:text-zinc-300">Get to know the people in your community.</p>
            </article>
            <article className="min-h-[210px] bg-zinc-100 p-6 dark:bg-zinc-900">
              <Star className="h-7 w-7 text-zinc-950 dark:text-zinc-50" /><h3 className="mt-8 font-semibold text-zinc-950 dark:text-zinc-50">Real reviews</h3><p className="mt-2 text-sm leading-5 text-zinc-700 dark:text-zinc-300">Build confidence with ratings after a job.</p>
            </article>
            <article className="min-h-[210px] bg-zinc-100 p-6 dark:bg-zinc-900">
              <MapPin className="h-7 w-7 text-zinc-950 dark:text-zinc-50" /><h3 className="mt-8 font-semibold text-zinc-950 dark:text-zinc-50">Help nearby</h3><p className="mt-2 text-sm leading-5 text-zinc-700 dark:text-zinc-300">Find people who work in your area.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-24">
        <div className="mx-auto flex min-h-[400px] w-full max-w-[1600px] flex-col items-center justify-center px-4 text-center md:px-8 lg:px-12">
          <h2 className="max-w-4xl text-4xl font-light leading-tight tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-[48px]">
            Got an <strong className="font-bold">endless to-do list</strong>? Or free time to <strong className="font-bold">earn extra cash</strong>?
          </h2>
          <Button asChild className="mt-9 min-w-52" size="lg"><Link href="/signup">Join the Hive</Link></Button>
        </div>
      </section>

      <footer className="bg-black text-white">
        <div className="mx-auto flex min-h-[190px] w-full max-w-[1600px] flex-col items-center justify-center gap-8 px-4 py-10 text-center md:px-8 lg:px-12">
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs text-zinc-400">
            <Link href="/">About Us</Link><Link href="/tasks">Browse Tasks</Link><Link href="/signup">Terms</Link><Link href="/signup">Privacy Policy</Link>
          </nav>
          <p className="flex items-center gap-1 text-lg font-bold">TaskHive © 2026 <Clock3 className="hidden h-4 w-4" aria-hidden="true" /><CheckCircle2 className="hidden h-4 w-4" aria-hidden="true" /></p>
        </div>
      </footer>
    </main>
  );
}