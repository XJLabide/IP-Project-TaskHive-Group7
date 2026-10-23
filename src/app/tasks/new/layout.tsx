import { guardPage } from "@/lib/auth/guard";

export default async function NewTaskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await guardPage("post_task");
  return children;
}
