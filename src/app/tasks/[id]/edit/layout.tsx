import { guardPage } from "@/lib/auth/guard";

export default async function EditTaskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await guardPage("post_task");
  return children;
}
