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
        <section className="flex min-h-[397px] flex-col justify-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-7 py-8 sm:px-10 lg:px-[56px] transition-colors">
          <p className="text-xl sm:text-[25px] dark:text-zinc-300">Welcome back, Ana!</p>
          <h1 className="mt-5 max-w-4xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[55px] dark:text-zinc-50">
            What can your neighborhood help you with?
          </h1>
          <form action="/tasks" className="mt-7 flex h-[57px] max-w-[1014px] items-center gap-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-4 text-zinc-900 dark:text-zinc-50 focus-within:border-[#FFC800] dark:focus-within:border-[#FFC800] transition-colors shadow-sm">
            <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-zinc-500 dark:text-zinc-400" />
            <input
              aria-label="Search nearby tasks"
              className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
              name="search"
              placeholder="Search tasks, categories, locations"
            />
            <button aria-label="Search" className="rounded-md bg-[#FFC800] p-2 text-black hover:bg-[#D19300] transition-colors" type="submit">
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </section>

        <nav aria-label="Task categories" className="mt-5 flex gap-3 overflow-x-auto pb-1">
          {categories.map((category, index) => (
            <Link
              aria-current={index === 0 ? "page" : undefined}
              className={`flex h-[45px] min-w-[190px] flex-1 items-center justify-center rounded-full px-5 text-sm transition-all sm:min-w-0 border ${
                index === 0 
                  ? "bg-[#FFC800] text-black font-bold border-[#FFC800] shadow-sm" 
                  : "bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium hover:border-[#FFC800] dark:hover:border-[#FFC800] hover:text-black dark:hover:text-[#FFC800]"
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
            <h2 className="text-2xl font-bold tracking-tight dark:text-zinc-50">Tasks near you</h2>
            <Link className="flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-[#D19300] dark:hover:text-[#FFC800] transition-colors" href="/tasks">
              Browse all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {tasks.map((task) => (
              <Link
                className="group flex min-h-[343px] flex-col rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 transition-all hover:border-[#FFC800] dark:hover:border-[#FFC800] hover:shadow-md"
                href={`/tasks/${task.id}`}
                key={task.id}
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-[90px] w-[90px] shrink-0 place-items-center rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xl font-semibold text-zinc-900 dark:text-zinc-100 transition-colors">
                    {task.poster.split(" ").map((part) => part[0]).join("")}
                  </span>
                  <div>
                    <p className="font-semibold dark:text-zinc-100">{task.poster}</p>
                    <p className="mt-1 flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                      <Star className="h-4 w-4 fill-[#FFC800] text-[#FFC800]" /> 4.9 · Poster
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-2 text-xs font-medium">
                  <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-zinc-800 dark:text-zinc-200 transition-colors">{task.distance}</span>
                  <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 text-zinc-800 dark:text-zinc-200 transition-colors">{task.deadline}</span>
                </div>
                <h3 className="mt-4 text-xl font-bold dark:text-zinc-50 group-hover:text-[#D19300] dark:group-hover:text-[#FFC800] transition-colors">{task.title}</h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{task.category}</p>
                <div className="mt-auto flex items-center justify-between pt-5 border-t border-zinc-100 dark:border-zinc-800 transition-colors">
                  <span className="flex items-center gap-1 text-sm font-medium text-zinc-500 dark:text-zinc-400"><MapPin className="h-4 w-4" /> Nearby</span>
                  <strong className="text-lg font-bold dark:text-zinc-50">₱ {task.budget}</strong>
                </div>
              </Link>
            ))}
          </div>

          <Link className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-[#D19300] dark:hover:text-[#FFC800] transition-colors" href="/tasks/new">
            <ClipboardList className="h-4 w-4" /> Post a task in your area
          </Link>
        </section>
    </AppShell>
  );
}