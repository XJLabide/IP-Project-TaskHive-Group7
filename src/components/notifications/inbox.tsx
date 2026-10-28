"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  Check,
  CircleCheck,
  FileText,
  LifeBuoy,
  MessageSquare,
  RotateCw,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type InboxNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string;
  readAt: string | null;
  createdAt: string;
};

type InboxData = {
  notifications: InboxNotification[];
  unreadCount: number;
};

type InboxState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "signed_out" }
  | ({ status: "ready" } & InboxData);

type NotificationKind = { label: string; Icon: LucideIcon };

function notificationKind(type: string): NotificationKind {
  if (type.startsWith("application.")) return { label: "Application", Icon: FileText };
  if (type.startsWith("chat.")) return { label: "Message", Icon: MessageSquare };
  if (type.startsWith("assignment.") || type.startsWith("payment.")) {
    return { label: "Assignment", Icon: BadgeCheck };
  }
  if (type.startsWith("completion.")) return { label: "Completion", Icon: CircleCheck };
  if (type.startsWith("support.") || type.startsWith("report.")) {
    return { label: "Support", Icon: LifeBuoy };
  }
  if (type.startsWith("verification.")) {
    return { label: "Verification", Icon: ShieldCheck };
  }
  if (type.startsWith("task.")) return { label: "Task", Icon: FileText };
  return { label: "Update", Icon: Bell };
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

export function NotificationInbox({ signedIn }: { signedIn: boolean }) {
  const [state, setState] = useState<InboxState>({ status: "loading" });
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [reloadKey, setReloadKey] = useState(0);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (!signedIn) {
      return;
    }

    let active = true;
    fetch("/api/notifications", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error("Notification request failed.");
        const result = await response.json();
        if (!Array.isArray(result.data?.notifications)) {
          throw new Error("Notification response was invalid.");
        }
        return result.data as InboxData;
      })
      .then((data) => {
        if (!active) return;
        setState(data ? { status: "ready", ...data } : { status: "signed_out" });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });

    return () => {
      active = false;
    };
  }, [signedIn, reloadKey]);

  async function markAsRead(notification: InboxNotification) {
    if (state.status !== "ready" || notification.readAt || markingId) return;

    setMarkingId(notification.id);
    setActionError("");
    try {
      const response = await fetch(`/api/notifications/${encodeURIComponent(notification.id)}`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error("Could not mark this notification as read.");
      const result = await response.json();
      const readAt =
        typeof result.data?.readAt === "string"
          ? result.data.readAt
          : new Date().toISOString();

      setState((current) => {
        if (current.status !== "ready") return current;
        const item = current.notifications.find((candidate) => candidate.id === notification.id);
        return {
          ...current,
          unreadCount: Math.max(0, current.unreadCount - (item?.readAt ? 0 : 1)),
          notifications: current.notifications.map((candidate) =>
            candidate.id === notification.id ? { ...candidate, readAt } : candidate,
          ),
        };
      });
    } catch {
      setActionError("We couldn't mark this notification as read. Try again.");
    } finally {
      setMarkingId(null);
    }
  }

  if (!signedIn || state.status === "signed_out") {
    const sessionExpired = signedIn && state.status === "signed_out";
    return (
      <section className="grid justify-items-center gap-3 border-y border-zinc-200 py-14 text-center dark:border-zinc-800">
        <Bell aria-hidden="true" className="h-7 w-7 text-zinc-500" />
        <div>
          <h2 className="font-semibold">
            {sessionExpired ? "Your session has expired" : "Sign in to see your notifications"}
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {sessionExpired
              ? "Sign in again to access task updates and messages."
              : "Task updates and messages are private to your account."}
          </p>
        </div>
        <Button asChild size="sm"><Link href="/login">Sign in</Link></Button>
      </section>
    );
  }

  if (state.status === "loading") {
    return (
      <section aria-busy="true" aria-label="Loading notifications" className="border-y border-zinc-200 dark:border-zinc-800">
        <p className="sr-only" role="status">Loading notifications</p>
        {[0, 1, 2].map((item) => (
          <div aria-hidden="true" className="flex gap-4 border-b border-zinc-200 px-4 py-5 last:border-0 dark:border-zinc-800" key={item}>
            <span className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
            <div className="grid flex-1 gap-2 py-1">
              <span className="h-4 w-2/5 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <span className="h-3 w-4/5 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
            </div>
          </div>
        ))}
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="grid justify-items-center gap-3 border-y border-zinc-200 py-14 text-center dark:border-zinc-800">
        <p className="font-semibold" role="alert">We couldn&apos;t load notifications.</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Check your connection and try again.</p>
        <Button onClick={() => { setState({ status: "loading" }); setReloadKey((key) => key + 1); }} size="sm" variant="outline">
          <RotateCw aria-hidden="true" className="h-4 w-4" />
          Try again
        </Button>
      </section>
    );
  }

  const visibleNotifications = state.notifications.filter(
    (notification) => filter === "all" || !notification.readAt,
  );

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div aria-label={`${state.unreadCount} unread notifications`} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#D19300] dark:bg-[#FFD50D]" />
          <span><strong className="font-semibold text-zinc-950 dark:text-zinc-50">{state.unreadCount}</strong> unread</span>
        </div>
        <div aria-label="Filter notifications" className="flex gap-2" role="group">
          <Button aria-pressed={filter === "all"} onClick={() => setFilter("all")} size="sm" variant={filter === "all" ? "default" : "outline"}>
            All
          </Button>
          <Button aria-pressed={filter === "unread"} onClick={() => setFilter("unread")} size="sm" variant={filter === "unread" ? "default" : "outline"}>
            Unread
          </Button>
        </div>
      </div>

      {actionError ? <p className="text-sm text-[#a01a26] dark:text-[#F04452]" role="alert">{actionError}</p> : null}

      {visibleNotifications.length === 0 ? (
        <section className="grid justify-items-center gap-3 border-y border-zinc-200 py-14 text-center dark:border-zinc-800">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
            {filter === "unread" ? <Check aria-hidden="true" className="h-5 w-5" /> : <Bell aria-hidden="true" className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="font-semibold">{filter === "unread" ? "You’re all caught up" : "No notifications yet"}</h2>
            <p className="mt-1 max-w-md text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {filter === "unread"
                ? "New updates about applications, messages, tasks, and support will appear here."
                : "Important updates about your applications, messages, tasks, payments, and support will appear here."}
            </p>
          </div>
          {filter === "all" ? (
            <Button asChild size="sm" variant="outline"><Link href="/tasks">Browse tasks</Link></Button>
          ) : null}
        </section>
      ) : (
        <ol aria-label="Notifications" className="border-y border-zinc-200 dark:border-zinc-800">
          {visibleNotifications.map((notification) => {
            const { Icon, label } = notificationKind(notification.type);
            const unread = !notification.readAt;
            return (
              <li className={`grid gap-3 border-b border-zinc-200 px-3 py-4 last:border-0 dark:border-zinc-800 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start sm:gap-4 sm:px-4 ${unread ? "bg-[#FFC800]/[0.06]" : ""}`} key={notification.id}>
                <div aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">{label}</span>
                    <span aria-label={unread ? "Unread" : "Read"} className="inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${unread ? "bg-[#D19300] dark:bg-[#FFD50D]" : "bg-zinc-400 dark:bg-zinc-600"}`} />
                      {unread ? "Unread" : "Read"}
                    </span>
                  </div>
                  <h2 className={`mt-1 text-sm leading-5 ${unread ? "font-semibold text-zinc-950 dark:text-zinc-50" : "font-medium text-zinc-800 dark:text-zinc-200"}`}>
                    {notification.title}
                  </h2>
                  {notification.body ? (
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                      {notification.body}
                    </p>
                  ) : null}
                  <time className="mt-2 block text-xs text-zinc-500 dark:text-zinc-500" dateTime={notification.createdAt}>
                    {formatTimestamp(notification.createdAt)}
                  </time>
                </div>
                <div className="flex flex-wrap items-center gap-1 sm:justify-end">
                  <Button asChild size="sm" variant="ghost">
                    <Link href={notification.href}>
                      Open update
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </Link>
                  </Button>
                  {unread ? (
                    <Button
                      disabled={markingId === notification.id}
                      onClick={() => void markAsRead(notification)}
                      size="sm"
                      variant="outline"
                    >
                      {markingId === notification.id ? "Saving…" : "Mark as read"}
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
