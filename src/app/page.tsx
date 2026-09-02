import Link from "next/link";
import {
  ArrowRight,
  Clock,
  MapPin,
  MessageSquare,
  Search,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    title: "Post the task",
    text: "Add the errand, budget, deadline, and location so nearby Taskers can respond.",
  },
  {
    title: "Choose who helps",
    text: "Review bids, check profiles, and chat before confirming the hire.",
  },
  {
    title: "Pay after approval",
    text: "Use test checkout after hiring, then release is recorded after completion.",
  },
];

const categories = ["Groceries", "Cleaning", "Repairs", "Delivery", "Tutoring", "Moving"];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <header className="border-b border-zinc-900 bg-zinc-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            TaskHive
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-zinc-300 md:flex">
            <Link className="hover:text-white" href="/tasks">
              Categories
            </Link>
            <Link className="hover:text-white" href="/dashboard">
              Dashboard
            </Link>
            <Link className="hover:text-white" href="/admin">
              Admin
            </Link>
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <Link className="hidden text-zinc-300 hover:text-white sm:block" href="/login">
              Log in
            </Link>
            <Button
              asChild
              className="border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-900"
              variant="outline"
            >
              <Link href="/signup">Sign up</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <h1 className="max-w-2xl text-5xl font-semibold leading-[0.95] tracking-tight md:text-7xl">
            Can your neighborhood help today?
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-zinc-600">
            Post errands, compare nearby Taskers, chat before hiring, and build
            trust through completed work and two-way reviews.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/tasks/new">
                Post a task <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/tasks">Become a Tasker</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-300 bg-zinc-50 p-4">
          <div className="rounded-md border border-zinc-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">Tasks near San Pedro</p>
                <p className="text-xs text-zinc-500">12 open tasks within 3 km</p>
              </div>
              <div className="flex h-9 w-full items-center gap-2 rounded-md border border-zinc-300 bg-zinc-50 px-3 text-sm text-zinc-500 sm:w-56">
                <Search className="h-4 w-4" />
                Search errands
              </div>
            </div>
            <div className="grid gap-0 md:grid-cols-[1fr_220px]">
              <div className="divide-y divide-zinc-100">
                {[
                  ["Pick up groceries", "Maria Santos", "PHP 450", "1.2 km", "Open"],
                  ["Fix kitchen cabinet", "Jose Reyes", "PHP 850", "2.1 km", "Bidding"],
                  ["Deliver documents", "Ana Cruz", "PHP 300", "0.8 km", "Open"],
                ].map(([task, poster, budget, distance, status]) => (
                  <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]" key={task}>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <strong>{task}</strong>
                        <span className="rounded-md border border-zinc-300 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600">
                          {status}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-600">
                        <span>{poster}</span>
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-zinc-900 text-zinc-900" />
                          4.9
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {distance}
                        </span>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <strong>{budget}</strong>
                      <p className="mt-1 text-xs text-zinc-500">Due today</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-zinc-200 bg-zinc-50 p-4 md:border-l md:border-t-0">
                <div className="grid h-full min-h-48 place-items-center rounded-md border border-dashed border-zinc-300 bg-white p-4 text-center">
                  <div>
                    <MapPin className="mx-auto h-7 w-7 text-zinc-700" />
                    <p className="mt-3 text-sm font-medium">Map-based browsing</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      Nearby task markers connect to the task list.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <h2 className="text-3xl font-semibold tracking-tight">
            3 steps. Zero hassle.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <div className="rounded-lg border border-zinc-200 bg-white p-5" key={step.title}>
                <div className="grid h-9 w-9 place-items-center rounded-full border border-zinc-300 text-sm font-semibold">
                  {index + 1}
                </div>
                <h3 className="mt-5 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">
            What can we help you cross off today?
          </h2>
          <p className="mt-4 text-sm leading-6 text-zinc-600">
            The marketplace starts with practical local work: chores, pickup,
            delivery, tutoring, repair help, and one-off errands.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 text-sm font-medium hover:bg-zinc-50"
              href="/tasks"
              key={category}
            >
              {category}
              <ArrowRight className="h-4 w-4 text-zinc-500" />
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-zinc-200">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-14 md:grid-cols-3">
          <div className="flex gap-3">
            <ShieldCheck className="mt-1 h-5 w-5" />
            <div>
              <h3 className="font-semibold">Verified profiles</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Users build trust with identity, skills, portfolio, and ratings.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <MessageSquare className="mt-1 h-5 w-5" />
            <div>
              <h3 className="font-semibold">Chat before hiring</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Posters and Taskers can clarify scope before payment starts.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Clock className="mt-1 h-5 w-5" />
            <div>
              <h3 className="font-semibold">Completion-based release</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Payment is recorded after hiring and released after confirmation.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
