import Link from "next/link";
import { Space_Grotesk } from "next/font/google";
import { redirect } from "next/navigation";
import { ArrowRight, ShieldCheck, Star, MapPin, ShoppingBasket, Wrench, Sparkles, Package, Truck, BookOpen } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { loadCurrentActor } from "@/lib/auth/current-actor";
import { CursorHoneycomb } from "./cursor-honeycomb";
import heroStyles from "./home-hero.module.css";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"] });

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

const categories = [
  { title: "Groceries & errands", icon: ShoppingBasket },
  { title: "Home repairs", icon: Wrench },
  { title: "Cleaning", icon: Sparkles },
  { title: "Delivery", icon: Package },
  { title: "Moving help", icon: Truck },
  { title: "Tutoring", icon: BookOpen },
];

const benefits = [
  { title: "Profiles you can trust", text: "Get to know the people in your community.", icon: ShieldCheck },
  { title: "Real reviews", text: "Build confidence with ratings after a job.", icon: Star },
  { title: "Help nearby", text: "Find people who work in your area.", icon: MapPin },
];

const contentFrame = "mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-10";
const panel = "rounded-[clamp(1rem,2.5vw,2rem)] border border-[#E3E7ED] px-[clamp(1rem,4vw,4rem)] py-[clamp(2rem,5vw,5rem)] dark:border-zinc-800";
const surface = "bg-white/85 dark:bg-[#18181B]/60";
const sectionHeading = "text-[clamp(2rem,4vw,3.5rem)] font-bold leading-[1.05] tracking-tight";

const questions = [
  ["How does TaskHive work?", "Post a task, review offers from local Taskers, and hire the person who suits your needs."],
  ["When do I pay for a task?", "You pay after choosing a Tasker. Payment is recorded while the task is underway and released after completion is confirmed."],
  ["Can I talk to a Tasker before hiring?", "Yes. Use chat to clarify the task details, timing, and expectations before you decide."],
  ["How do I earn as a Tasker?", "Create a profile, browse tasks in your area, and send an offer for work you can complete."],
];

export default async function Home() {
  // Signed-in members skip the marketing page; the landing page is for guests.
  const actor = await loadCurrentActor();
  if (actor?.signedIn) redirect("/dashboard");

  return (
    <div data-page-scroll className="h-dvh overflow-y-auto bg-[#F7F8FA] text-[#17191D] dark:bg-[#09090B] dark:text-[#FAFAFA]">
      <div className={heroStyles.landing}>
        <div aria-hidden="true" className={heroStyles.backdrop}>
          <div className={heroStyles.fade}>
            <CursorHoneycomb />
          </div>
        </div>

        <SiteHeader active="home" />

        <main>
          <section aria-labelledby="hero-title" className="grid min-h-svh content-end pt-32 pb-[clamp(2.5rem,9svh,7rem)] text-white md:pt-24 md:pb-[clamp(3rem,10svh,7rem)]">
            <div className={contentFrame}>
              <h1 id="hero-title" className={`${spaceGrotesk.className} leading-[1.02] tracking-[-0.045em]`}>
                <span className="block text-[clamp(2rem,5.5vw,5.25rem)] font-medium">Got a task?</span>{" "}
                <span className="block text-[clamp(2.75rem,8vw,8rem)] font-bold text-[#FFC800]">Ask the Hive.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-200 sm:text-lg">
                When digital tools fall short, TaskHive brings real help to your doorstep. Post a task, pick a hero, and get it done.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg"><Link href="/tasks/new">Post a task <ArrowRight aria-hidden="true" className="size-4" /></Link></Button>
                <Button asChild size="lg" variant="outline" className="border-zinc-500 bg-transparent text-white hover:bg-zinc-800 hover:text-white dark:border-zinc-500 dark:bg-transparent dark:text-white"><Link href="/tasks">Browse tasks</Link></Button>
              </div>
            </div>
          </section>

          <div className={`${contentFrame} flex flex-col gap-[clamp(1rem,2.5vw,2rem)] pb-[clamp(1rem,2.5vw,2rem)] pt-3 sm:pt-5`}>
            <section aria-labelledby="categories-title" className={`${panel} ${surface}`}>
              <h2 id="categories-title" className={sectionHeading}>What can we help you with?</h2>
              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map(({ title, icon: Icon }) => (
                  <Link
                    className="group flex items-center gap-3 rounded-2xl border border-[#E3E7ED] bg-white p-4 font-semibold hover:border-[#D19300] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D19300] sm:p-5 dark:border-zinc-800 dark:bg-[#18181B] dark:hover:border-[#FFC800]"
                    href="/tasks"
                    key={title}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#FFC800]/25 text-[#674900] dark:text-[#FFC800]">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">{title}</span>
                    <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-zinc-500 group-hover:text-current dark:text-zinc-400" />
                  </Link>
                ))}
              </div>
            </section>

            <section aria-labelledby="steps-title" className={`${panel} bg-[#FFFDF7]/85 dark:bg-[#18181B]/60`}>
              <h2 id="steps-title" className={sectionHeading}>How it works</h2>
              <ol className="mt-7 grid gap-4 md:grid-cols-3">
                {steps.map((step) => (
                  <li className="rounded-2xl border border-[#E3E7ED] bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-[#09090B]" key={step.number}>
                    <span aria-hidden="true" className="inline-flex rounded-lg bg-[#FFC800] px-3 py-1 text-sm font-bold text-zinc-950">{step.number}</span>
                    <h3 className="mt-4 text-xl font-bold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#5D6571] dark:text-zinc-300">{step.text}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section aria-labelledby="benefits-title" className={`${panel} ${surface}`}>
              <h2 id="benefits-title" className={sectionHeading}>Why TaskHive?</h2>
              <div className="mt-7 grid gap-4 md:grid-cols-3">
                {benefits.map(({ title, text, icon: Icon }) => (
                  <article className="rounded-2xl border border-[#E3E7ED] bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-[#18181B]" key={title}>
                    <Icon aria-hidden="true" className="size-6 text-[#805A00] dark:text-[#FFC800]" />
                    <h3 className="mt-4 text-xl font-bold">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#5D6571] dark:text-zinc-300">{text}</p>
                  </article>
                ))}
              </div>
            </section>

            <section aria-labelledby="faq-title" className={`${panel} ${surface} grid gap-6 lg:grid-cols-[1fr_1.6fr] lg:gap-12`}>
              <h2 id="faq-title" className={sectionHeading}>Frequently asked questions</h2>
              <div className="divide-y divide-[#E3E7ED] border-y border-[#E3E7ED] dark:divide-zinc-700 dark:border-zinc-700">
                {questions.map(([question, answer]) => (
                  <details className="group py-4" key={question}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D19300] [&::-webkit-details-marker]:hidden">
                      {question}<span aria-hidden="true" className="text-xl leading-none text-zinc-500 group-open:rotate-45 dark:text-zinc-400">+</span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-[#5D6571] dark:text-zinc-300">{answer}</p>
                  </details>
                ))}
              </div>
            </section>

            <section aria-labelledby="join-title" className={`${panel} flex flex-col items-center gap-6 border-[#FFC800] bg-[#FFC800]/85 text-center text-zinc-950 dark:border-[#FFC800]`}>
              <h2 id="join-title" className={sectionHeading}>Ready to get started?</h2>
              <Button asChild size="lg" className="bg-zinc-950 text-white hover:bg-zinc-800 focus-visible:ring-zinc-950"><Link href="/signup">Join the Hive <ArrowRight aria-hidden="true" className="size-4" /></Link></Button>
            </section>
          </div>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
