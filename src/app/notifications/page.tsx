"use client";

import { AppShell } from "@/components/layout/app-shell";
import { NotificationInbox } from "@/components/notifications/inbox";
import { useViewer } from "@/components/viewer/viewer-provider";

export default function NotificationsPage() {
  const { viewer } = useViewer();

  return (
    <AppShell
      description="Updates about your applications, conversations, tasks, and support."
      title="Notifications"
    >
      <NotificationInbox signedIn={viewer.signedIn} />
    </AppShell>
  );
}
