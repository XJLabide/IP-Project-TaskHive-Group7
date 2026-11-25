"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GateNotice } from "@/components/viewer/gate-notice";
import { useViewer } from "@/components/viewer/viewer-provider";
import { useMarketplace } from "@/lib/mock-marketplace-store";
import { formatChatTime } from "@/lib/chat/demo";
import type { TaskSummary } from "@/lib/tasks/types";
import { requestData } from "@/lib/marketplace/http";
import type { ChatMessageView, ChatSummary } from "@/lib/chat/service";
import { shouldUseMarketplacePreview } from "@/lib/marketplace/preview";

export function TaskChat({ task }: { task: TaskSummary }) {
  const { isPreview } = useViewer();
  return shouldUseMarketplacePreview(isPreview) ? <DemoTaskChat task={task} /> : <PersistentTaskChat key={task.id} task={task} />;
}

function DemoTaskChat({ task }: { task: TaskSummary }) {
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
  const isOwner =
    viewer.signedIn &&
    (user === task.poster ||
      (user === "TaskHive Member" && (task.poster === "Ana Reyes" || task.poster === "TaskHive Member")) ||
      (user === "Ana Reyes" && task.poster === "TaskHive Member"));
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

function PersistentTaskChat({ task }: { task: TaskSummary }) {
  const { viewer } = useViewer();
  const [threads, setThreads] = useState<ChatSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [loading, setLoading] = useState(viewer.signedIn);
  const [loadedThreadId, setLoadedThreadId] = useState<string | null>(null);
  const [canPost, setCanPost] = useState(task.status === "open");
  const [sending, setSending] = useState(false);
  const [reported, setReported] = useState<Set<string>>(() => new Set());
  const [isOwner, setIsOwner] = useState(false);
  const taskThreads = threads.filter((thread) => thread.taskId === task.id);
  const selected = taskThreads.find((thread) => thread.id === activeId) ?? taskThreads[0] ?? null;
  const loadingMessages = Boolean(selected && loadedThreadId !== selected.id);

  useEffect(() => {
    if (!viewer.signedIn) return;
    const controller = new AbortController();
    void Promise.all([
      requestData<ChatSummary[]>("/api/chats", { signal: controller.signal }),
      requestData<{ role: "poster" | "tasker" }>(`/api/tasks/${encodeURIComponent(task.id)}/bids`, { signal: controller.signal }),
    ])
      .then(([chats, taskApplications]) => {
        setThreads(chats);
        setIsOwner(taskApplications.role === "poster");
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : "Could not load conversations.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [task.id, viewer.signedIn, retryCount]);

  useEffect(() => {
    if (!selected || !viewer.signedIn) {
      return;
    }
    const controller = new AbortController();
    void requestData<{ chat: ChatSummary; canPost: boolean; messages: ChatMessageView[] }>(
      `/api/chats/${encodeURIComponent(selected.id)}/messages`,
      { signal: controller.signal },
    )
      .then((result) => {
        setMessages(result.messages.map((message) => ({
          ...message,
          createdAt: new Date(String(message.createdAt)),
        })));
        setCanPost(result.canPost);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : "Could not load messages.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedThreadId(selected.id);
      });
    return () => controller.abort();
  }, [selected, task.id, viewer.signedIn, retryCount]);

  async function handleOpen() {
    setFeedback("");
    try {
      const chat = await requestData<ChatSummary>("/api/chats", {
        method: "POST",
        body: JSON.stringify({ taskId: task.id }),
      });
      setThreads((current) => [chat, ...current.filter((thread) => thread.id !== chat.id)]);
      setActiveId(chat.id);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not open a conversation.");
    }
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !body.trim()) return;
    setSending(true);
    setFeedback("");
    try {
      const message = await requestData<ChatMessageView>(
        `/api/chats/${encodeURIComponent(selected.id)}/messages`,
        { method: "POST", body: JSON.stringify({ body }) },
      );
      setMessages((current) => [...current, { ...message, createdAt: new Date(String(message.createdAt)) }]);
      setBody("");
      setThreads((current) => current.map((thread) => thread.id === selected.id
        ? { ...thread, lastMessage: { body: message.body, senderId: message.senderId, createdAt: message.createdAt } }
        : thread));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not send this message.");
    } finally {
      setSending(false);
    }
  }

  async function handleReport(messageId: string) {
    if (!window.confirm("Report this message for Admin review?")) return;
    try {
      await requestData("/api/reports", {
        method: "POST",
        body: JSON.stringify({ messageId, reason: "Reported from the task conversation." }),
      });
      setReported((current) => new Set(current).add(messageId));
      setFeedback("Message sent to Admin for review.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not report this message.");
    }
  }

  return (
    <Card id="chat">
      <CardContent className="grid gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-bold">Messages</h2><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">About: {task.title}</p></div>{!canPost ? <Badge className="border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Read-only · task closed</Badge> : null}</div>
        {!viewer.signedIn ? <><GateNotice code="sign_in_required" /><Button asChild size="sm" variant="outline"><Link href="/login">Sign in to message</Link></Button></> : viewer.denials.chat ? <GateNotice code={viewer.denials.chat} /> : null}
        {loading ? <p role="status" className="text-sm text-zinc-500">Loading conversations…</p> : null}
        {loadError ? <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/60"><p aria-live="assertive" role="alert" className="text-sm text-zinc-600 dark:text-zinc-300">{loadError}</p><Button onClick={() => { setLoadError(""); setLoading(true); setLoadedThreadId(null); setRetryCount((count) => count + 1); }} size="sm" type="button" variant="outline">Reload conversation</Button></div> : null}
        {feedback ? <p aria-live="polite" role="status" className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">{feedback}</p> : null}
        {viewer.signedIn && !viewer.denials.chat ? <>
          {isOwner && taskThreads.length > 1 ? <div aria-label="Conversations" className="flex flex-wrap gap-2">{taskThreads.map((thread) => <Button aria-pressed={thread.id === selected?.id} key={thread.id} onClick={() => setActiveId(thread.id)} size="sm" type="button" variant={thread.id === selected?.id ? "default" : "outline"}>{thread.openerName ?? `Tasker ${taskThreads.indexOf(thread) + 1}`}</Button>)}</div> : null}
          {selected ? <div className="grid gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">{isOwner ? `Conversation with ${selected.openerName ?? "a Tasker"}` : `Conversation with ${selected.posterName ?? "the Poster"}`}</p>
            {loadingMessages ? <p role="status" className="text-sm text-zinc-500">Loading messages…</p> : null}
            <ol className="grid gap-2">{messages.length === 0 && !loadingMessages ? <li className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">No messages yet. Ask about the scope before you {isOwner ? "hire" : "apply"}.</li> : messages.map((message) => {
              const currentParticipantId = isOwner ? selected.posterId : selected.openerId;
              const mine = message.senderId === currentParticipantId;
              return <li className={`rounded-xl p-3 text-sm ${mine ? "ml-6 bg-[#FFD50D]/20 dark:bg-[#FFC800]/10" : "mr-6 bg-zinc-100 dark:bg-zinc-800/60"}`} key={message.id}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">{mine ? "You" : message.senderName ?? (isOwner ? "Tasker" : "Poster")}</p><span className="text-xs text-zinc-400">{formatChatTime(message.createdAt.toISOString())}</span></div><p className="mt-1 leading-6">{message.body}</p>{!mine ? reported.has(message.id) ? <p className="mt-2 text-xs font-semibold text-[#a01a26] dark:text-[#F04452]">Reported for review</p> : <Button className="mt-1 h-auto px-0 text-xs underline underline-offset-4" onClick={() => void handleReport(message.id)} size="sm" type="button" variant="ghost">Report message</Button> : null}</li>;
            })}</ol>
            {canPost ? <form className="grid gap-2" onSubmit={(event) => void handleSend(event)}><label className="text-sm font-semibold" htmlFor="chat-body">Reply</label><textarea className="min-h-20 rounded-xl border border-zinc-200 bg-white p-3 text-sm font-normal text-zinc-950 outline-none focus:border-[#D19300] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-[#FFD50D]" id="chat-body" maxLength={2000} onChange={(event) => setBody(event.target.value)} placeholder="Ask about the task or share availability" value={body} /><div className="flex justify-end"><Button disabled={sending || body.trim().length === 0} size="sm" type="submit">{sending ? "Sending…" : "Send message"}</Button></div></form> : <p className="text-sm text-zinc-500 dark:text-zinc-400">This task is closed, so the conversation is read-only.</p>}
          </div> : isOwner ? <p className="text-sm text-zinc-500 dark:text-zinc-400">No one has messaged you about this task yet.</p> : task.status === "open" ? <div className="grid gap-3"><p className="text-sm text-zinc-500 dark:text-zinc-400">Ask the Poster a question before you apply. The thread stays attached to this task.</p><Button disabled={loading} onClick={() => void handleOpen()} size="sm" type="button" variant="outline">Message Poster</Button></div> : null}
        </> : null}
      </CardContent>
    </Card>
  );
}
