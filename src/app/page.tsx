import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, MapPin, ShieldCheck, Star } from "lucide-react";
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
    <main className="min-h-screen bg-white text-zinc-950">
      <header className="bg-black text-white">
        <div className="mx-auto flex h-[75px] max-w-[1512px] items-center justify-between px-6 lg:px-16">
          <Link href="/" className="text-2xl font-extrabold tracking-tight">TaskHive</Link>
          <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
            <Link href="/tasks" className="hover:text-zinc-300">Categories</Link>
          </nav>
          <div className="flex items-center gap-6 text-sm font-semibold">
            <Link className="hover:text-zinc-300" href="/login">Log in</Link>
            <Link className="hover:text-zinc-300" href="/signup">Sign up</Link>
          </div>
        </div>
      </header>

      <section className="border-b border-zinc-400">
        <div className="mx-auto grid min-h-[625px] max-w-[1512px] items-center gap-12 px-6 py-14 lg:grid-cols-[1fr_1.05fr] lg:px-[8.5%]">
          <div>
            <h1 className="max-w-xl text-5xl font-light leading-[1.02] tracking-tight sm:text-6xl lg:text-[72px]">
              CAN YOUR <span className="font-semibold">TASKS</span> GET DONE?
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-zinc-600">
              When digital tools fall short, TaskHive brings real help to your doorstep. Post a task, pick a hero, and get it done.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button asChild className="min-w-52" size="lg"><Link href="/tasks/new">Post a Task</Link></Button>
              <Button asChild className="min-w-56" size="lg" variant="outline"><Link href="/tasks">Become a Tasker</Link></Button>
            </div>
          </div>
          <div aria-label="Illustration placeholder" className="relative aspect-[1.3] w-full border-2 border-black bg-zinc-200">
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-medium text-zinc-600">Local help, right around the corner</span>
            <span className="absolute inset-0 overflow-hidden" aria-hidden="true">
              <span className="absolute left-1/2 top-1/2 h-[140%] w-px origin-center -translate-x-1/2 -translate-y-1/2 rotate-[52deg] bg-black" />
              <span className="absolute left-1/2 top-1/2 h-[140%] w-px origin-center -translate-x-1/2 -translate-y-1/2 -rotate-[52deg] bg-black" />
            </span>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-400">
        <div className="mx-auto max-w-[1512px] px-6 py-16 lg:px-[8.5%] lg:py-20">
          <h2 className="text-center text-4xl font-light tracking-tight sm:text-[50px]"><strong className="font-bold">3</strong> Steps. <strong className="font-bold">Zero</strong> Hassle.</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-[1.4fr_1fr_0.9fr]">
            {steps.map((step) => (
              <article className="min-h-[250px] bg-zinc-200 p-7 sm:p-9" key={step.number}>
                <p className="text-sm font-semibold text-zinc-500">{step.number}</p>
                <h3 className="mt-10 text-2xl font-semibold">{step.title}</h3>
                <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-700">{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-400">
        <div className="mx-auto max-w-[1512px] px-6 py-16 lg:px-[8.5%] lg:py-20">
          <h2 className="text-center text-3xl font-light tracking-tight sm:text-[42px]">What Can We Help You Cross Off Today?</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link className="flex min-h-[50px] items-center justify-between bg-zinc-200 px-5 text-sm font-medium hover:bg-zinc-300" href="/tasks" key={category}>
                {category}<ArrowRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-400">
        <div className="mx-auto max-w-[1512px] px-6 py-16 lg:px-[11.5%] lg:py-20">
          <h2 className="text-center text-3xl font-light tracking-tight sm:text-[42px]">Got <strong className="font-bold">Questions</strong>? We’ve Got <strong className="font-bold">Answers</strong></h2>
          <div className="mt-12">
            {questions.map(([question, answer]) => (
              <details className="group border-b border-zinc-400 py-5 first:border-t" key={question}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium marker:hidden">
                  {question}<span aria-hidden="true" className="text-xl text-zinc-500 group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-400">
        <div className="mx-auto grid max-w-[1512px] items-center gap-9 px-6 py-16 lg:grid-cols-[0.9fr_2.1fr] lg:px-[8.5%] lg:py-20">
          <div>
            <h2 className="text-4xl font-light tracking-tight">Why <strong className="font-bold">TaskHive</strong>?</h2>
            <p className="mt-3 text-sm text-zinc-500">Built for local trust.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <article className="min-h-[210px] bg-zinc-200 p-6">
              <ShieldCheck className="h-7 w-7" /><h3 className="mt-8 font-semibold">Profiles you can trust</h3><p className="mt-2 text-sm leading-5 text-zinc-700">Get to know the people in your community.</p>
            </article>
            <article className="min-h-[210px] bg-zinc-200 p-6">
              <Star className="h-7 w-7" /><h3 className="mt-8 font-semibold">Real reviews</h3><p className="mt-2 text-sm leading-5 text-zinc-700">Build confidence with ratings after a job.</p>
            </article>
            <article className="min-h-[210px] bg-zinc-200 p-6">
              <MapPin className="h-7 w-7" /><h3 className="mt-8 font-semibold">Help nearby</h3><p className="mt-2 text-sm leading-5 text-zinc-700">Find people who work in your area.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="border-b border-zinc-400">
        <div className="mx-auto flex min-h-[400px] max-w-[1512px] flex-col items-center justify-center px-6 py-20 text-center">
          <h2 className="max-w-4xl text-4xl font-light leading-tight tracking-tight sm:text-[48px]">
            Got an <strong className="font-bold">endless to-do list</strong>? Or free time to <strong className="font-bold">earn extra cash</strong>?
          </h2>
          <Button asChild className="mt-9 min-w-52" size="lg"><Link href="/signup">Join the Hive</Link></Button>
        </div>
      </section>

      <footer className="bg-black text-white">
        <div className="mx-auto flex min-h-[190px] max-w-[1512px] flex-col items-center justify-center gap-8 px-6 py-10 text-center">
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs text-zinc-400">
            <Link href="/">About Us</Link><Link href="/tasks">Browse Tasks</Link><Link href="/signup">Terms</Link><Link href="/signup">Privacy Policy</Link>
          </nav>
          <p className="flex items-center gap-1 text-lg font-bold">TaskHive © 2026 <Clock3 className="hidden h-4 w-4" aria-hidden="true" /><CheckCircle2 className="hidden h-4 w-4" aria-hidden="true" /></p>
        </div>
      </footer>
    </main>
  );
}
