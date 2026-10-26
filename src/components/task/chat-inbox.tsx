"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PublicShell } from "@/components/layout/public-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useViewer } from "@/components/viewer/viewer-provider";
import { useMarketplace } from "@/lib/mock-marketplace-store";
import { useMockTasks } from "@/lib/mock-task-store";
import { chatsForUser, formatChatTime, lastMessage } from "@/lib/chat/demo";

export function ChatInbox() {
  const { viewer } = useViewer();
  const { chats } = useMarketplace();
  const { tasks } = useMockTasks();

  const user = viewer.displayName;
  const mine = user ? chatsForUser(chats, user) : [];
  const Shell = viewer.signedIn ? AppShell : PublicShell;

  return (
    <Shell
      title="Chat inbox"
      description="Task-scoped conversations with Posters and Taskers."
    >
      {!viewer.signedIn ? (
        <Card>
          <CardContent className="grid gap-3 p-6">
            <p className="font-semibold">Sign in to see your messages.</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Conversations are visible only to the two participants.
            </p>
            <Button asChild className="w-fit" size="sm" variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      ) : mine.length === 0 ? (
        <Card>
          <CardContent className="grid min-h-40 place-items-center p-6 text-center">
            <div>
              <p className="font-semibold">No conversations yet.</p>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Open a task and message the Poster — the thread stays attached to it.
              </p>
              <Button asChild className="mt-4" size="sm" variant="outline">
                <Link href="/tasks">Browse tasks</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {mine.map((chat) => {
            const task = tasks.find((item) => item.id === chat.taskId);
            const other = chat.opener === user ? chat.poster : chat.opener;
            const latest = lastMessage(chat);

            return (
              <Card key={chat.id}>
                <CardContent className="grid gap-2 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      className="font-bold hover:text-[#D19300] dark:hover:text-[#FFD50D]"
                      href={`/tasks/${chat.taskId}#chat`}
                    >
                      {task?.title ?? "Task no longer in this session"}
                    </Link>
                    {task && task.status !== "open" ? (
                      <Badge className="border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        Read-only
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    With {other}
                    {latest ? ` · ${formatChatTime(latest.createdAt)}` : ""}
                  </p>
                  <p className="line-clamp-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                    {latest ? latest.body : "No messages yet."}
                  </p>
                  <div>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/tasks/${chat.taskId}#chat`}>Open conversation</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
