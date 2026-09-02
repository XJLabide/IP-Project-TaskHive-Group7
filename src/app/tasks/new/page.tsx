import { CalendarDays, MapPin, ReceiptText } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewTaskPage() {
  return (
    <AppShell title="Create Task" description="Post a bidding or fixed-price local errand.">
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Task details</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium">
                  Task title
                  <input
                    className="h-11 rounded-lg border border-zinc-300 bg-white px-3 font-normal outline-none focus:border-zinc-600"
                    placeholder="Pick up groceries"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Category
                  <select className="h-11 rounded-lg border border-zinc-300 bg-white px-3 font-normal outline-none focus:border-zinc-600">
                    <option>Delivery</option>
                    <option>Cleaning</option>
                    <option>Tutoring</option>
                    <option>Repairs</option>
                    <option>Moving</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Budget
                  <input
                    className="h-11 rounded-lg border border-zinc-300 bg-white px-3 font-normal outline-none focus:border-zinc-600"
                    placeholder="PHP 450"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Deadline
                  <input
                    className="h-11 rounded-lg border border-zinc-300 bg-white px-3 font-normal outline-none focus:border-zinc-600"
                    placeholder="Today, 5:00 PM"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-medium">
                Location
                <div className="flex h-11 items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-zinc-500">
                  <MapPin className="h-4 w-4" />
                  <input
                    className="min-w-0 flex-1 bg-transparent font-normal text-zinc-950 outline-none"
                    placeholder="Search with Mapbox"
                  />
                </div>
              </label>

              <div className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-medium">Hiring mode</p>
                <div className="grid gap-3 md:grid-cols-3">
                  {["Bidding", "Fixed price manual", "Fixed price auto"].map((mode, index) => (
                    <label
                      className="flex items-start gap-3 rounded-lg border border-zinc-300 bg-white p-3 text-sm"
                      key={mode}
                    >
                      <input className="mt-1" defaultChecked={index === 0} name="mode" type="radio" />
                      <span>{mode}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="grid gap-2 text-sm font-medium">
                Description
                <textarea
                  className="min-h-36 rounded-lg border border-zinc-300 bg-white p-3 font-normal outline-none focus:border-zinc-600"
                  placeholder="Describe the task, pickup/drop-off details, and anything the Tasker should know."
                />
              </label>

              <div className="flex flex-wrap justify-end gap-3 border-t border-zinc-200 pt-5">
                <Button type="button" variant="outline">
                  Save draft
                </Button>
                <Button type="button">Publish task</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Before publishing</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <div className="flex gap-3">
                <CalendarDays className="mt-0.5 h-4 w-4 text-zinc-500" />
                <p className="leading-6 text-zinc-600">
                  Clear deadlines help Taskers decide if they can commit.
                </p>
              </div>
              <div className="flex gap-3">
                <ReceiptText className="mt-0.5 h-4 w-4 text-zinc-500" />
                <p className="leading-6 text-zinc-600">
                  Payment starts only after you approve a Tasker.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Payment estimate</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-600">Task budget</span>
                <strong>PHP 450.00</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Platform fee</span>
                <strong>PHP 22.50</strong>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-3">
                <span className="text-zinc-600">Checkout total</span>
                <strong>PHP 472.50</strong>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
