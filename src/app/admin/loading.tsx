import { AppShell } from "@/components/layout/app-shell";
import { AdminLoading } from "@/components/admin/admin-loading";

export default function AdminPageLoading() {
  return (
    <AppShell description="Support queues, decisions, and marketplace oversight from real records." title="Global Admin">
      <AdminLoading />
    </AppShell>
  );
}
