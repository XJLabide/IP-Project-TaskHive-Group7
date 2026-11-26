"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PublicPageLoading } from "@/components/layout/public-page-loading";
import { AdminLoading } from "@/components/admin/admin-loading";
import { useViewer } from "@/components/viewer/viewer-provider";

export default function AdminPageLoading() {
  const { viewer } = useViewer();
  if (!viewer.isAdmin) return <PublicPageLoading />;

  return (
    <AppShell description="Support queues, decisions, and marketplace oversight from real records." title="Global Admin">
      <AdminLoading />
    </AppShell>
  );
}
