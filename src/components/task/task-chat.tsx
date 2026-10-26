"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GateNotice } from "@/components/viewer/gate-notice";
import { useViewer } from "@/components/viewer/viewer-provider";
import { useMarketplace } from "@/lib/mock-marketplace-store";
import { formatChatTime } from "@/lib/chat/demo";
import type { TaskSummary } from "@/lib/tasks/types";

export function TaskChat({ task }: { task: TaskSummary }) {
  const { viewer } = useViewer();
  const {
    chats,
    chatForTask,
    openChat,
    sendMessage,
    reportMessage,
  } = useMarketplace();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);

  const user = viewer.displayName;
  const isOwner = viewer.signedIn && user === task.poster;
  const threads = isOwner
    ? chats.filter((chat) => chat.taskId === task.id)
    : user
      ? [chatForTask(task.id, user)].filter((chat) => chat !== null)
      : [];
  const selected = activeId
    ? threads.find((chat) => chat.id === activeId) ?? threads[0] ?? null
    : threads[0] ?? null;
  const canWrite = task.status === "open";

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !selected) return;

    setSending(true);
    setFeedback("");
    await new Promise((resolve) => setTimeout(resolve, 200));
    const result = sendMessage({
      task,
      chatId: selected.id,
      sender: user,
      body,
    });
    setSending(false);

    if (!result.ok) {
      setFeedback(result.reason);
      return;
    }

    setBody("");
  }

  function handleOpen() {
    if (!user) return;
    const result = openChat(task, user);
    if (!result.ok) {
      setFeedback(result.reason);
      return;
    }
    setActiveId(result.chat.id);
    setFeedback("");
  }

  function handleReport(chatId: string, messageId: string) {
    if (!user) return;
    if (!window.confirm("Report this message for Admin review?")) return;

    const result = reportMessage({ chatId, messageId, reporter: user });
    setFeedback(result.ok ? "Message marked for review in this demo." : result.reason);
  }

  return (
    <Card id="chat">
      <CardContent className="grid gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-bold">Messages</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              About: {task.title}
            </p>
          </div>
          {!canWrite ? (
            <Badge className="border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              Read-only · task closed
            </Badge>
          ) : null}
        </div>

        <p className="text-xs text-zinc-400">
          Demo: messages stay in this browser session; reporting is not sent to an Admin.
        </p>

        {!viewer.signedIn ? (
          <>
            <GateNotice code="sign_in_required" />
            <Button asChild size="sm" variant="outline">
              <Link href="/login">Sign in to message the Poster</Link>
            </Button>
          </>
        ) : viewer.denials.chat ? (
          <GateNotice code={viewer.denials.chat} />
        ) : (
          <>
            {feedback ? (
              <p
                aria-live="polite"
                className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300"
                role="status"
              >
                {feedback}
              </p>
            ) : null}

            {isOwner && threads.length > 1 ? (
              <div aria-label="Conversations" className="flex flex-wrap gap-2">
                {threads.map((chat) => (
                  <Button
                    aria-pressed={chat.id === selected?.id}
                    key={chat.id}
                    onClick={() => setActiveId(chat.id)}
                    size="sm"
                    type="button"
                    variant={chat.id === selected?.id ? "default" : "outline"}
                  >
                    {chat.opener}
                  </Button>
                ))}
              </div>
            ) : null}

            {selected ? (
              <div className="grid gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                  {isOwner ? `Conversation with ${selected.opener}` : `Conversation with ${selected.poster}`}
                </p>
                <ol className="grid gap-2">
                  {selected.messages.length === 0 ? (
                    <li className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                      No messages yet. Ask about the scope before you {isOwner ? "hire" : "apply"}.
                    </li>
                  ) : (
                    selected.messages.map((message) => {
                      const mine = message.sender === user;
                      return (
                        <li
                          className={`rounded-xl p-3 text-sm ${
                            mine
                              ? "ml-6 bg-[#FFD50D]/20 dark:bg-[#FFC800]/10"
                              : "mr-6 bg-zinc-100 dark:bg-zinc-800/60"
                          }`}
                          key={message.id}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                              {mine ? "You" : message.sender}
                            </p>
                            <span className="text-xs text-zinc-400">
                              {formatChatTime(message.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 leading-6">{message.body}</p>
                          {!mine ? (
                            message.reported ? (
                              <p className="mt-2 text-xs font-semibold text-[#a01a26] dark:text-[#F04452]">
                                Reported (demo)
                              </p>
                            ) : (
                              <Button
                                className="mt-1 h-auto px-0 text-xs underline underline-offset-4"
                                onClick={() => handleReport(selected.id, message.id)}
                                size="sm"
                                type="button"
                                variant="ghost"
                              >
                                Report message
                              </Button>
                            )
                          ) : null}
                        </li>
                      );
                    })
                  )}
                </ol>

                {canWrite ? (
                  <form className="grid gap-2" onSubmit={handleSend}>
                    <label className="text-sm font-semibold" htmlFor="chat-body">
                      Reply
                    </label>
                    <textarea
                      className="min-h-20 rounded-xl border border-zinc-200 bg-white p-3 text-sm font-normal text-zinc-950 outline-none focus:border-[#D19300] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-[#FFD50D]"
                      id="chat-body"
                      maxLength={2000}
                      onChange={(event) => setBody(event.target.value)}
                      placeholder="Ask about the task or share availability"
                      value={body}
                    />
                    <div className="flex justify-end">
                      <Button
                        disabled={sending || body.trim().length === 0}
                        size="sm"
                        type="submit"
                      >
                        {sending ? "Sending…" : "Send message"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    This task is closed, so the conversation is read-only.
                  </p>
                )}
              </div>
            ) : isOwner ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No one has messaged you about this task yet.
              </p>
            ) : task.status === "open" ? (
              <div className="grid gap-3">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Ask the Poster a question before you apply. The thread stays attached to this
                  task.
                </p>
                <Button onClick={handleOpen} size="sm" type="button" variant="outline">
                  Message Poster
                </Button>
              </div>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                You can message the Poster only while the task is open.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
