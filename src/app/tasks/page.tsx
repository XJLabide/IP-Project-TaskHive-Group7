import { MapPin, Search, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { TaskCard } from "@/components/task/task-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { tasks } from "@/lib/sample-data";

const filters = ["All", "Open", "Bidding", "Fixed price", "Within 3 km"];

export default function TasksPage() {
  return (
    <AppShell
      title="Browse Tasks"
      description="Find nearby errands by category, budget, status, and distance."
    >
      <div className="grid gap-6">
        <Card>
          <CardContent className="grid gap-4 pt-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex h-12 items-center gap-3 rounded-lg border border-zinc-300 bg-zinc-50 px-4 text-sm text-zinc-500">
              <Search className="h-5 w-5" />
              Search tasks, locations, categories
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.map((filter, index) => (
                <Button
                  key={filter}
                  size="sm"
                  type="button"
                  variant={index === 0 ? "default" : "outline"}
                >
                  {filter}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[280px_1fr_340px]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium">
                Category
                <select className="h-10 rounded-lg border border-zinc-300 bg-white px-3 font-normal">
                  <option>All categories</option>
                  <option>Delivery</option>
                  <option>Cleaning</option>
                  <option>Tutoring</option>
                  <option>Repairs</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Budget
                <select className="h-10 rounded-lg border border-zinc-300 bg-white px-3 font-normal">
                  <option>Any budget</option>
                  <option>Under PHP 500</option>
                  <option>PHP 500 to 1,000</option>
                  <option>PHP 1,000+</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Distance
                <select className="h-10 rounded-lg border border-zinc-300 bg-white px-3 font-normal">
                  <option>Within 3 km</option>
                  <option>Within 5 km</option>
                  <option>Within 10 km</option>
                </select>
              </label>
              <Button type="button" variant="outline">
                Reset filters
              </Button>
            </CardContent>
          </Card>

          <section className="grid content-start gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Available tasks</h2>
                <p className="mt-1 text-sm text-zinc-600">Showing {tasks.length} nearby tasks</p>
              </div>
              <Badge>Updated now</Badge>
            </div>
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Browse by location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid min-h-80 place-items-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
                <div>
                  <MapPin className="mx-auto h-8 w-8 text-zinc-700" />
                  <p className="mt-3 text-sm font-medium">Mapbox task map</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    Task pins appear here and filter the list by selected area.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
