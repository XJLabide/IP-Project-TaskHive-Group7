"use client";

import { useEffect, useState } from "react";
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
import { requestData } from "@/lib/marketplace/http";
import type { ChatSummary } from "@/lib/chat/service";
import { shouldUseMarketplacePreview } from "@/lib/marketplace/preview";

export function ChatInbox() {
  const { isPreview } = useViewer();
  return shouldUseMarketplacePreview(isPreview) ? <DemoChatInbox /> : <PersistentChatInbox />;
}

function DemoChatInbox() {
  const { viewer } = useViewer();
  const { chats } = useMarketplace();
  const { tasks } = useMockTasks();
  const user = viewer.displayName;
  const mine = user ? chatsForUser(chats, user) : [];
  const Shell = viewer.signedIn ? AppShell : PublicShell;

  return (
    <Shell title="Chat inbox" description="Preview task-scoped conversations.">
      {!viewer.signedIn ? (
        <Card><CardContent className="grid gap-3 p-6"><p className="font-semibold">Sign in to see your messages.</p><Button asChild className="w-fit" size="sm" variant="outline"><Link href="/login">Sign in</Link></Button></CardContent></Card>
      ) : mine.length === 0 ? (
        <Card><CardContent className="grid min-h-40 place-items-center p-6 text-center"><div><p className="font-semibold">No conversations yet.</p><p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Open a task and message the Poster.</p><Button asChild className="mt-4" size="sm" variant="outline"><Link href="/tasks">Browse tasks</Link></Button></div></CardContent></Card>
      ) : (
        <div className="grid gap-4">{mine.map((chat) => {
          const task = tasks.find((item) => item.id === chat.taskId);
          const other = chat.opener === user ? chat.poster : chat.opener;
          const latest = lastMessage(chat);
          return <Card key={chat.id}><CardContent className="grid gap-2 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><Link className="font-bold hover:text-[#D19300] dark:hover:text-[#FFD50D]" href={`/tasks/${chat.taskId}#chat`}>{task?.title ?? "Task no longer in this preview"}</Link>{task && task.status !== "open" ? <Badge className="border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Read-only</Badge> : null}</div><p className="text-sm text-zinc-500 dark:text-zinc-400">With {other}{latest ? ` · ${formatChatTime(latest.createdAt)}` : ""}</p><p className="line-clamp-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{latest?.body ?? "No messages yet."}</p><Button asChild size="sm" variant="ghost"><Link href={`/tasks/${chat.taskId}#chat`}>Open conversation</Link></Button></CardContent></Card>;
        })}</div>
      )}
    </Shell>
  );
}

function PersistentChatInbox() {
  const { viewer } = useViewer();
  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  const [error, setError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    if (!viewer.signedIn) return;
    const controller = new AbortController();
    void requestData<ChatSummary[]>("/api/chats", { signal: controller.signal })
      .then(setChats)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load messages.");
      });
    return () => controller.abort();
  }, [viewer.signedIn, reloadCount]);

  return (
    <AppShell title="Chat inbox" description="Task-scoped conversations with Posters and Taskers.">
      {!viewer.signedIn ? (
        <Card><CardContent className="grid gap-3 p-6"><p className="font-semibold">Sign in to see your messages.</p><p className="text-sm text-zinc-500 dark:text-zinc-400">Conversations are visible only to their two participants.</p><Button asChild className="w-fit" size="sm" variant="outline"><Link href="/login">Sign in</Link></Button></CardContent></Card>
      ) : error ? (
        <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 p-6"><p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p><Button onClick={() => { setError(""); setChats(null); setReloadCount((count) => count + 1); }} size="sm" type="button" variant="outline">Try again</Button></CardContent></Card>
      ) : chats === null ? (
        <p role="status" className="text-sm text-zinc-500">Loading conversations…</p>
      ) : chats.length === 0 ? (
        <Card><CardContent className="grid min-h-40 place-items-center p-6 text-center"><div><p className="font-semibold">No conversations yet</p><p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Open a task and message the Poster or Tasker. Your conversations and replies will appear here.</p><Button asChild className="mt-4" size="sm" variant="outline"><Link href="/tasks">Browse open tasks</Link></Button></div></CardContent></Card>
      ) : (
        <div className="grid gap-4">{chats.map((chat) => (
          <Card key={chat.id}><CardContent className="grid gap-2 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><Link className="font-bold hover:text-[#D19300] dark:hover:text-[#FFD50D]" href={`/tasks/${chat.taskId}#chat`}>{chat.taskTitle}</Link>{!chat.canPost ? <Badge className="border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Read-only</Badge> : null}</div><p className="text-sm text-zinc-500 dark:text-zinc-400">{chat.openerName ?? "Tasker"} · {chat.posterName ?? "Poster"}{chat.lastMessage ? ` · ${formatChatTime(String(chat.lastMessage.createdAt))}` : ""}</p><p className="line-clamp-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{chat.lastMessage?.body ?? "No messages yet."}</p><Button asChild size="sm" variant="ghost"><Link href={`/tasks/${chat.taskId}#chat`}>Open conversation</Link></Button></CardContent></Card>
        ))}</div>
      )}
    </AppShell>
  );
}
