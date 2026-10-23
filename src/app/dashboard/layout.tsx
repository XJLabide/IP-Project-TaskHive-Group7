import { guardPage } from "@/lib/auth/guard";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await guardPage("view_private_account");
  return children;
}
