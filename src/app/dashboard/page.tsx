import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  MessageSquare,
  Search,
  Star,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tasks } from "@/lib/sample-data";

const categories = ["All", "Delivery", "Cleaning", "Repairs", "Tutoring", "Moving"];

const applications = [
  ["Dog walking", "Bid submitted", "PHP 350"],
  ["Cabinet repair", "Approved", "PHP 850"],
  ["Document delivery", "In progress", "PHP 300"],
];

export default function DashboardPage() {
  return (
    <AppShell
      title="Dashboard"
      description="Manage the tasks you post and the work you apply for from one account."
    >
      <div className="grid gap-6">
        <section className="rounded-lg border border-zinc-200 bg-white p-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-end">
            <div>
              <p className="text-sm text-zinc-600">Welcome back, Ana</p>
              <h2 className="mt-2 max-w-2xl text-4xl font-semibold leading-tight tracking-tight">
                What can your neighborhood help you with?
              </h2>
              <div className="mt-6 flex h-12 max-w-2xl items-center gap-3 rounded-lg border border-zinc-300 bg-zinc-50 px-4 text-sm text-zinc-500">
                <Search className="h-5 w-5" />
                Search groceries, cleaning, delivery, tutoring
              </div>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Profile readiness</p>
                  <p className="mt-1 text-xs text-zinc-500">Identity and skills complete</p>
                </div>
                <strong className="text-2xl">86%</strong>
              </div>
              <div className="mt-4 h-2 rounded-full bg-zinc-200">
                <div className="h-2 w-[86%] rounded-full bg-zinc-950" />
              </div>
              <Button className="mt-4 w-full" type="button" variant="outline">
                Continue verification
              </Button>
            </div>
          </div>
        </section>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((category, index) => (
            <Button
              key={category}
              size="sm"
              type="button"
              variant={index === 0 ? "default" : "outline"}
            >
              {category}
            </Button>
          ))}
        </div>

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle>Tasks near you</CardTitle>
                <Button asChild size="sm" variant="outline">
                  <Link href="/tasks">
                    Browse all <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {tasks.map((task) => (
                <Link
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 hover:bg-white"
                  href={`/tasks/${task.id}`}
                  key={task.id}
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-zinc-200 text-sm font-semibold">
                      {task.poster
                        .split(" ")
                        .map((part) => part[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="font-medium">{task.poster}</p>
                      <div className="mt-1 flex items-center gap-1 text-sm text-zinc-600">
                        <Star className="h-4 w-4 fill-zinc-950 text-zinc-950" />
                        4.9
                      </div>
                    </div>
                  </div>
                  <h3 className="mt-5 font-semibold">{task.title}</h3>
                  <div className="mt-3 grid gap-2 text-sm text-zinc-600">
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {task.distance}
                    </span>
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {task.deadline}
                    </span>
                  </div>
                  <div className="mt-5 flex items-center justify-between">
                    <strong>PHP {task.budget}</strong>
                    <Badge>{task.status}</Badge>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tasks I Applied To</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                {applications.map(([title, status, amount]) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                    key={title}
                  >
                    <div>
                      <strong>{title}</strong>
                      <p className="mt-1 text-zinc-600">{status}</p>
                    </div>
                    <span className="font-medium">{amount}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Messages</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                {[
                  ["Maria Santos", "Can you deliver before 5 PM?"],
                  ["Jose Reyes", "I uploaded a cabinet photo."],
                ].map(([name, message]) => (
                  <div className="flex gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3" key={name}>
                    <MessageSquare className="mt-0.5 h-4 w-4 text-zinc-500" />
                    <div>
                      <strong>{name}</strong>
                      <p className="mt-1 text-zinc-600">{message}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Tasks I Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-zinc-200">
              {tasks.map((task) => (
                <div
                  className="grid gap-3 border-t border-zinc-200 p-4 first:border-t-0 md:grid-cols-[1fr_auto_auto_auto]"
                  key={task.id}
                >
                  <div>
                    <strong>{task.title}</strong>
                    <p className="mt-1 text-sm text-zinc-600">
                      {task.category} at {task.location}
                    </p>
                  </div>
                  <Badge>{task.status}</Badge>
                  <span className="text-sm font-medium">PHP {task.budget}</span>
                  <CheckCircle2 className="h-5 w-5 text-zinc-500" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
