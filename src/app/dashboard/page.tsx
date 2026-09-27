import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  MapPin,
  Search,
  Star,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { tasks } from "@/lib/sample-data";

const categories = ["All tasks", "Delivery", "Cleaning", "Tutoring"];

export default function DashboardPage() {
  return (
    <AppShell
      title="Dashboard"
      description="Tasks and local work in your area."
      showHeader={false}
      contentClassName="mx-auto max-w-[1229px] px-4 py-6 sm:px-6 lg:px-7 lg:py-9"
    >
        <section className="flex min-h-[397px] flex-col justify-center rounded-md border border-zinc-800 bg-[#d9d9d9] px-7 py-8 sm:px-10 lg:px-[56px]">
          <p className="text-xl sm:text-[25px]">Welcome back, Ana!</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[55px]">
            What can your neighborhood help you with?
          </h1>
          <form action="/tasks" className="mt-7 flex h-[57px] max-w-[1014px] items-center gap-3 rounded-md border border-zinc-800 bg-zinc-500 px-4 text-white">
            <Search aria-hidden="true" className="h-5 w-5 shrink-0" />
            <input
              aria-label="Search nearby tasks"
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-100"
              name="search"
              placeholder="Search tasks, categories, locations"
            />
            <button aria-label="Search" className="rounded p-2 hover:bg-black/10" type="submit">
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </section>

        <nav aria-label="Task categories" className="mt-5 flex gap-3 overflow-x-auto pb-1">
          {categories.map((category, index) => (
            <Link
              aria-current={index === 0 ? "page" : undefined}
              className={`flex h-[45px] min-w-[190px] flex-1 items-center justify-center rounded-full px-5 text-sm font-medium transition-colors sm:min-w-0 ${
                index === 0 ? "bg-black text-white" : "bg-[#afafaf] hover:bg-zinc-300"
              }`}
              href={index === 0 ? "/tasks" : `/tasks?category=${encodeURIComponent(category)}`}
              key={category}
            >
              {category}
            </Link>
          ))}
        </nav>

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold tracking-tight">Tasks near you</h2>
            <Link className="flex items-center gap-2 text-sm font-medium hover:underline" href="/tasks">
              Browse all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {tasks.map((task) => (
              <Link
                className="flex min-h-[343px] flex-col rounded-md border border-zinc-500 bg-[#d9d9d9] p-5 transition-colors hover:bg-zinc-200"
                href={`/tasks/${task.id}`}
                key={task.id}
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-[90px] w-[90px] shrink-0 place-items-center rounded-full bg-zinc-500 text-xl font-semibold text-white">
                    {task.poster.split(" ").map((part) => part[0]).join("")}
                  </span>
                  <div>
                    <p className="font-medium">{task.poster}</p>
                    <p className="mt-1 flex items-center gap-1 text-sm text-zinc-700">
                      <Star className="h-4 w-4 fill-black text-black" /> 4.9 · Poster
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-2 text-xs text-zinc-700">
                  <span className="rounded bg-black px-3 py-1 text-white">{task.distance}</span>
                  <span className="rounded bg-black px-3 py-1 text-white">{task.deadline}</span>
                </div>
                <h3 className="mt-4 text-xl font-medium">{task.title}</h3>
                <p className="mt-1 text-sm text-zinc-700">{task.category}</p>
                <div className="mt-auto flex items-center justify-between pt-5">
                  <span className="flex items-center gap-1 text-sm text-zinc-700"><MapPin className="h-4 w-4" /> Nearby</span>
                  <strong className="text-lg">₱ {task.budget}</strong>
                </div>
              </Link>
            ))}
          </div>

          <Link className="mt-6 inline-flex items-center gap-2 text-sm font-medium hover:underline" href="/tasks/new">
            <ClipboardList className="h-4 w-4" /> Post a task in your area
          </Link>
        </section>
    </AppShell>
  );
}
