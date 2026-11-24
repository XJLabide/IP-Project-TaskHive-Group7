import Link from "next/link";
import { Space_Grotesk } from "next/font/google";
import { redirect } from "next/navigation";
import { ArrowRight, Minus, Plus, Search, ShieldCheck, Star, MapPin, ShoppingBasket, Wrench, Sparkles, Package, Truck, BookOpen } from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Button } from "@/components/ui/button";
import { loadCurrentActor } from "@/lib/auth/current-actor";
import { CursorHoneycomb } from "./cursor-honeycomb";
import { StepAccordion } from "./step-accordion";
import heroStyles from "./home-hero.module.css";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"] });

const steps = [
  {
    number: "1",
    title: "Post a task",
    text: "Describe what you need, where you need it, and the budget you have in mind.",
  },
  {
    number: "2",
    title: "Choose your Tasker",
    text: "Compare offers from people nearby, check their profiles, and chat before you hire.",
  },
  {
    number: "3",
    title: "Get it done",
    text: "Pay securely after hiring and confirm the task when the work is complete.",
  },
];

const categories = [
  { title: "Groceries & errands", filter: "Errands", icon: ShoppingBasket, text: "Get help with shopping, pickups, and everyday to-dos." },
  { title: "Home repairs", filter: "Repairs", icon: Wrench, text: "Find a hand with small fixes and home projects." },
  { title: "Cleaning", filter: "Cleaning", icon: Sparkles, text: "Get your space ready for a move, a visit, or a fresh start." },
  { title: "Delivery", filter: "Delivery", icon: Package, text: "Find someone to pick up and drop off items nearby." },
  { title: "Moving help", filter: "Moving", icon: Truck, text: "Get an extra pair of hands for boxes and furniture." },
  { title: "Tutoring", filter: "Tutoring", icon: BookOpen, text: "Connect with someone who can help you learn." },
];

const benefits = [
  { title: "Profiles you can trust", text: "Get to know the people in your community.", icon: ShieldCheck },
  { title: "Real reviews", text: "Build confidence with ratings after a job.", icon: Star },
  { title: "Help nearby", text: "Find people who work in your area.", icon: MapPin },
];

const contentFrame = "mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-10";
const panel = `${heroStyles.panel} rounded-[1.75rem] border px-[clamp(1.25rem,4vw,3.5rem)] py-[clamp(2rem,5vw,4rem)]`;
const sectionHeading = `${spaceGrotesk.className} ${heroStyles.accent} text-[clamp(2rem,4vw,3.5rem)] font-bold leading-[1.05] tracking-tight`;

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
    <div data-page-scroll className={`${heroStyles.page} h-dvh overflow-y-auto`}>
      <div className={heroStyles.landing}>
        <div aria-hidden="true" className={heroStyles.backdrop}>
          <div className={heroStyles.fade}>
            <CursorHoneycomb />
          </div>
        </div>

        <SiteHeader active="home" />

        <main>
          <section aria-labelledby="hero-title" className={`${heroStyles.hero} px-6 pb-16 pt-32 text-center sm:pb-24 sm:pt-40`}>
            <div className="mx-auto max-w-3xl">
              <h1 id="hero-title" className={`${spaceGrotesk.className} text-[clamp(3rem,8vw,7rem)] font-bold leading-[0.98] tracking-[-0.06em]`}>
                Got a task?<br />
                <span className={heroStyles.accent}>Ask the Hive.</span>
              </h1>
              <p className={`${heroStyles.muted} mx-auto mt-6 max-w-lg text-base leading-relaxed sm:text-lg`}>
                Find a Tasker nearby for errands, repairs, and the everyday jobs you could use a hand with.
              </p>

              <form action="/tasks" method="get" role="search" aria-label="Search tasks" className={`${heroStyles.search} mx-auto mt-8 flex max-w-xl flex-wrap items-center gap-2 rounded-2xl border p-2 text-left sm:flex-nowrap`}>
                <label htmlFor="landing-task-search" className="sr-only">Search for a task</label>
                <div className="flex min-w-0 flex-1 basis-full items-center gap-3 px-3 sm:basis-auto">
                  <Search aria-hidden="true" className={`${heroStyles.accent} size-5 shrink-0`} />
                  <input id="landing-task-search" name="search" type="search" placeholder="Try “furniture assembly”" className="h-11 w-full min-w-0 rounded-md bg-transparent px-1 text-base" />
                </div>
                <Button type="submit" size="lg" className="w-full sm:w-auto">
                  Browse tasks <ArrowRight aria-hidden="true" className="size-4" />
                </Button>
              </form>

              <ul aria-label="Popular task categories" className="mt-4 flex flex-wrap justify-center gap-2">
                {categories.slice(0, 3).map(({ filter, icon: Icon }) => (
                  <li key={filter}>
                    <Link href={{ pathname: "/tasks", query: { category: filter } }} className={`${heroStyles.chip} inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold`}>
                      <Icon aria-hidden="true" className={`${heroStyles.accent} size-4`} />{filter}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/tasks/new" className={`${heroStyles.accent} mt-6 inline-flex items-center gap-2 rounded-sm text-sm font-bold underline underline-offset-4`}>
                Post a task <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </section>

          <div className={`${contentFrame} flex flex-col gap-6 pb-8 sm:gap-8`}>
            <section aria-labelledby="categories-title" className={panel}>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 id="categories-title" className={sectionHeading}>What Can We Help You With?</h2>
                  <p className={`${heroStyles.muted} mt-3 max-w-lg leading-relaxed`}>Explore everyday tasks that people can help with, close to home.</p>
                </div>
                <Link href="/tasks" className={`${heroStyles.accent} inline-flex items-center gap-2 rounded-sm text-sm font-bold underline underline-offset-4`}>
                  View all tasks <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {categories.map(({ title, filter, text, icon: Icon }) => (
                  <Link
                    className={`${heroStyles.card} ${heroStyles.chip} group block rounded-2xl border p-5 sm:p-6`}
                    href={{ pathname: "/tasks", query: { category: filter } }}
                    key={filter}
                  >
                    <span className="flex items-center justify-between">
                      <span className={`${heroStyles.icon} grid size-11 place-items-center rounded-xl`}>
                        <Icon aria-hidden="true" className="size-5" />
                      </span>
                      <ArrowRight aria-hidden="true" className={`${heroStyles.accent} size-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none`} />
                    </span>
                    <h3 className="mt-5 text-lg font-bold">{title}</h3>
                    <p className={`${heroStyles.muted} mt-1 text-sm leading-relaxed`}>{text}</p>
                  </Link>
                ))}
              </div>
            </section>

            <div className="grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <section aria-labelledby="steps-title" className={`${panel} ${heroStyles.pairedSection}`}>
                <h2 id="steps-title" className={sectionHeading}>How It Works</h2>
                <StepAccordion steps={steps} />
              </section>

              <section aria-labelledby="benefits-title" className={`${panel} ${heroStyles.pairedSection}`}>
                <h2 id="benefits-title" className={sectionHeading}>Why TaskHive?</h2>
                <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-1">
                  {benefits.map(({ title, text, icon: Icon }) => (
                    <article className={`${heroStyles.card} flex items-start gap-3 rounded-2xl border p-4`} key={title}>
                      <Icon aria-hidden="true" className={`${heroStyles.accent} mt-0.5 size-5 shrink-0`} />
                      <div>
                        <h3 className="font-bold">{title}</h3>
                        <p className={`${heroStyles.muted} mt-1 text-sm leading-relaxed`}>{text}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <section aria-labelledby="faq-title" className={`${panel} grid items-start gap-6 lg:grid-cols-2 lg:gap-12`}>
              <h2 id="faq-title" className={`${sectionHeading} lg:text-[clamp(2.5rem,4.2vw,4rem)]`}>
                Frequently Asked <span className="lg:block">Questions</span>
              </h2>
              <div>
                {questions.map(([question, answer]) => (
                  <details className={`${heroStyles.faqRow} group`} key={question}>
                    <summary className="grid cursor-pointer list-none grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-4 rounded-sm py-5 text-[clamp(1.0625rem,2vw,1.375rem)] font-medium [&::-webkit-details-marker]:hidden">
                      <span aria-hidden="true" className={heroStyles.accent}>
                        <Plus className="size-6 group-open:hidden" />
                        <Minus className="hidden size-6 group-open:block" />
                      </span>
                      <span>{question}</span>
                    </summary>
                    <p className={`${heroStyles.muted} pb-5 pl-10 text-base leading-relaxed`}>{answer}</p>
                  </details>
                ))}
              </div>
            </section>

            <section aria-labelledby="join-title" className={`${panel} flex flex-col items-center gap-6 ${heroStyles.join} text-center`}>
              <h2 id="join-title" className={sectionHeading}>Ready to Get Started?</h2>
              <Button asChild size="lg" className="focus-visible:ring-offset-zinc-950"><Link href="/signup">Join the Hive <ArrowRight aria-hidden="true" className="size-4" /></Link></Button>
            </section>
          </div>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
