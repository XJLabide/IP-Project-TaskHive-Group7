import { guardPage } from "@/lib/auth/guard";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await guardPage("review_verification_appeal");
  return children;
}
