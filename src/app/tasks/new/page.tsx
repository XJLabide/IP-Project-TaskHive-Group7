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
                    className="h-11 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 font-normal outline-none focus:border-zinc-600 dark:focus:border-zinc-500 transition-colors"
                    placeholder="Pick up groceries"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Category
                  <select className="h-11 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 font-normal outline-none focus:border-zinc-600 dark:focus:border-zinc-500 transition-colors">
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
                    className="h-11 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 font-normal outline-none focus:border-zinc-600 dark:focus:border-zinc-500 transition-colors"
                    placeholder="PHP 450"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Deadline
                  <input
                    className="h-11 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 font-normal outline-none focus:border-zinc-600 dark:focus:border-zinc-500 transition-colors"
                    placeholder="Today, 5:00 PM"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm font-medium">
                Location
                <div className="flex h-11 items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 text-zinc-500 dark:text-zinc-400 transition-colors">
                  <MapPin className="h-4 w-4" />
                  <input
                    className="min-w-0 flex-1 bg-transparent font-normal text-zinc-950 dark:text-zinc-50 outline-none"
                    placeholder="Search with Mapbox"
                  />
                </div>
              </label>

              <div className="grid gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4 transition-colors">
                <p className="text-sm font-medium">Hiring mode</p>
                <div className="grid gap-3 md:grid-cols-3">
                  {["Bidding", "Fixed price manual", "Fixed price auto"].map((mode, index) => (
                    <label
                      className="flex items-start gap-3 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 text-sm transition-colors"
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
                  className="min-h-36 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 font-normal outline-none focus:border-zinc-600 dark:focus:border-zinc-500 transition-colors"
                  placeholder="Describe the task, pickup/drop-off details, and anything the Tasker should know."
                />
              </label>

              <div className="flex flex-wrap justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800 pt-5 transition-colors">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="border-[#FFC800] text-zinc-900 dark:text-zinc-100 hover:border-[#D19300] hover:bg-[#FFD50D]/10 dark:hover:border-[#FFD50D] dark:hover:bg-[#FFC800]/10 hover:text-[#D19300] dark:hover:text-[#FFD50D]"
                >
                  Save draft
                </Button>
                <Button 
                  type="button" 
                  className="bg-[#FFC800] text-black hover:bg-[#D19300] font-semibold border-none shadow-sm"
                >
                  Publish task
                </Button>
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
                <CalendarDays className="mt-0.5 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                <p className="leading-6 text-zinc-600 dark:text-zinc-400">
                  Clear deadlines help Taskers decide if they can commit.
                </p>
              </div>
              <div className="flex gap-3">
                <ReceiptText className="mt-0.5 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                <p className="leading-6 text-zinc-600 dark:text-zinc-400">
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
                <span className="text-zinc-600 dark:text-zinc-400">Task budget</span>
                <strong>PHP 450.00</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">Platform fee</span>
                <strong>PHP 22.50</strong>
              </div>
              <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-3">
                <span className="text-zinc-600 dark:text-zinc-400">Checkout total</span>
                <strong>PHP 472.50</strong>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}