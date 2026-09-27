import { AlertTriangle, Banknote, ClipboardList, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { reports, tasks } from "@/lib/sample-data";

const metrics = [
  ["Total users", "12,458"],
  ["Active tasks", "1,243"],
  ["Platform fees", "PHP 18,452"],
  ["Pending reports", "58"],
  ["Open disputes", "23"],
];

const payments = [
  ["PAY-10091", "Pick up groceries", "PHP 450", "Held"],
  ["PAY-10088", "Clean storage room", "PHP 900", "Released"],
  ["PAY-10077", "Math tutoring", "PHP 600", "Disputed"],
];

// Reusable outline button styles for the admin dashboard
const outlineButtonStyles = "border-[#FFC800] text-zinc-900 dark:text-zinc-100 hover:border-[#D19300] hover:bg-[#FFD50D]/10 dark:hover:border-[#FFD50D] dark:hover:bg-[#FFC800]/10 hover:text-[#D19300] dark:hover:text-[#FFD50D]";

export default function AdminPage() {
  return (
    <AppShell
      title="Global Admin"
      description="Platform-level oversight for users, tasks, reports, disputes, and payment metadata."
    >
      <div className="grid gap-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {metrics.map(([label, value]) => (
            <Card key={label}>
              <CardContent className="p-5">
                <strong className="text-2xl tracking-tight">{value}</strong>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{label}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle>Report and dispute queue</CardTitle>
                <Button size="sm" type="button" variant="outline" className={outlineButtonStyles}>
                  View all
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  <span>Type</span>
                  <span>Subject</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>
                {reports.map((report) => (
                  <div
                    className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3 border-t border-zinc-100 dark:border-zinc-800 p-3 text-sm first:border-t-0"
                    key={report.id}
                  >
                    <span>{report.type}</span>
                    <span>{report.subject}</span>
                    <Badge>{report.status}</Badge>
                    <Button size="sm" type="button" variant="outline" className={outlineButtonStyles}>
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Marketplace health</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              {[
                [Users, "User trust", "94% verified profiles"],
                [ClipboardList, "Task flow", "38 completed this week"],
                [Banknote, "Escrow status", "PHP 12,458 held"],
                [ShieldCheck, "Moderation", "5 high-priority items"],
              ].map(([Icon, label, value]) => (
                <div className="flex gap-3" key={label as string}>
                  <Icon className="mt-0.5 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                  <div>
                    <strong>{label as string}</strong>
                    <p className="mt-1 text-zinc-600 dark:text-zinc-400">{value as string}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Task management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                {tasks.map((task) => (
                  <div
                    className="grid gap-3 border-t border-zinc-100 dark:border-zinc-800 p-4 first:border-t-0 md:grid-cols-[1fr_auto_auto]"
                    key={task.id}
                  >
                    <div>
                      <strong>{task.title}</strong>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {task.poster} · {task.deadline}
                      </p>
                    </div>
                    <Badge>{task.status}</Badge>
                    <Button size="sm" type="button" variant="outline" className={outlineButtonStyles}>
                      View
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payments overview</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4 text-sm">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                  <p className="leading-6 text-zinc-600 dark:text-zinc-400">
                    Admins see payment metadata only: task, users, amount,
                    status, dates, and provider reference.
                  </p>
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                {payments.map(([id, task, amount, status]) => (
                  <div
                    className="grid gap-3 border-t border-zinc-100 dark:border-zinc-800 p-4 text-sm first:border-t-0 md:grid-cols-[auto_1fr_auto_auto]"
                    key={id}
                  >
                    <span className="font-medium">{id}</span>
                    <span>{task}</span>
                    <strong>{amount}</strong>
                    <Badge>{status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Recent admin activity</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            {[
              "Resolved dispute DP-1024 for Paint bedroom",
              "Suspended user after repeated fake task reports",
              "Restored task after manual review",
            ].map((item) => (
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-3" key={item}>
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}