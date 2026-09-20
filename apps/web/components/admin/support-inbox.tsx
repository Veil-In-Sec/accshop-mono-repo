"use client"

import { MessageCircle, Send } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import useSWR from "swr"

import {
  getSupportThread,
  listSupportConversations,
  replySupportMessage,
} from "@/app/actions/admin"
import type { SupportConversation, SupportThread } from "@/lib/api/types"
import { ClientDate } from "@/components/client-date"

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export function SupportInbox({ initial }: { initial: SupportConversation[] }) {
  const { data: conversations } = useSWR("admin-support-conversations", listSupportConversations, {
    fallbackData: initial,
    refreshInterval: 5000,
    revalidateOnFocus: true,
  })
  const list = conversations ?? initial

  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const activeId =
    selectedId && list.some((c) => c.userId === selectedId)
      ? selectedId
      : (list.find((c) => c.unread > 0)?.userId ?? list[0]?.userId ?? null)

  const { data: thread, mutate: mutateThread } = useSWR<SupportThread>(
    activeId ? ["admin-support-thread", activeId] : null,
    () => getSupportThread(activeId!),
    { refreshInterval: 4000, revalidateOnFocus: true },
  )

  const [draft, setDraft] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const bottomRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setDraft("")
  }, [activeId])

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [thread?.messages.length, activeId])

  async function send() {
    const text = draft.trim()
    if (!text || !activeId || sending) return
    setSending(true)
    try {
      await replySupportMessage(activeId, text)
      setDraft("")
      await mutateThread()
    } catch {
      toast.error("Could not send reply. Please try again.")
    } finally {
      setSending(false)
    }
  }

  const active = list.find((c) => c.userId === activeId)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <div className="rounded-[20px] border border-white/[0.06] bg-zinc-900 p-3">
        <p className="px-2 pb-2 pt-1 text-xs font-medium tracking-wide text-zinc-500">
          Conversations ({list.length})
        </p>
        <div className="flex max-h-[560px] flex-col gap-1 overflow-y-auto">
          {list.map((c) => (
            <button
              key={c.userId}
              onClick={() => setSelectedId(c.userId)}
              className={`pressable rounded-xl px-3 py-2.5 text-left transition-colors ${
                c.userId === activeId ? "bg-[#5362AD]/25" : "hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-white">{c.userEmail}</p>
                {c.unread > 0 && (
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-bold text-zinc-900">
                    {c.unread > 9 ? "9+" : c.unread}
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <p className="truncate text-xs text-zinc-500">
                  {c.lastSender === "admin" ? "You: " : ""}
                  {c.lastText}
                </p>
                <span className="shrink-0 text-[10px] text-zinc-600">{timeAgo(c.lastAt)}</span>
              </div>
            </button>
          ))}
          {list.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-3 py-10 text-center">
              <MessageCircle className="size-6 text-zinc-600" />
              <p className="text-sm text-zinc-500">No chats yet. Customer messages appear here.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-[480px] flex-col rounded-[20px] border border-white/[0.06] bg-zinc-900">
        {!active ? (
          <div className="flex flex-1 items-center justify-center p-10">
            <p className="text-sm text-zinc-500">Select a conversation to start replying.</p>
          </div>
        ) : (
          <>
            <div className="border-b border-white/[0.06] px-5 py-3.5">
              <p className="text-sm font-semibold text-white">{active.userEmail}</p>
              <p className="text-xs text-zinc-500">
                {active.userName ? `${active.userName} • ` : ""}
                {active.total} message{active.total === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex max-h-[480px] flex-1 flex-col gap-2 overflow-y-auto p-5">
              {(thread?.messages ?? []).map((m) => (
                <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                      m.sender === "admin"
                        ? "rounded-br-md bg-[#5362AD] text-white"
                        : "rounded-bl-md bg-white/[0.06] text-zinc-100"
                    }`}
                  >
                    <p>{m.text}</p>
                    <p className={`mt-1 text-[10px] ${m.sender === "admin" ? "text-white/60" : "text-zinc-500"}`}>
                      <ClientDate iso={m.createdAt} />
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                send()
              }}
              className="flex items-center gap-2 border-t border-white/[0.06] p-4"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Reply to ${active.userEmail}…`}
                aria-label="Reply message"
                maxLength={2000}
                className="h-10 flex-1 rounded-full bg-white/[0.04] px-4 text-sm text-white placeholder:text-zinc-600 outline-none focus:bg-white/[0.07]"
              />
              <button
                type="submit"
                aria-label="Send reply"
                disabled={!draft.trim() || sending}
                className="pressable flex size-10 shrink-0 items-center justify-center rounded-full bg-[#5362AD] text-white hover:bg-[#4351a0] disabled:opacity-40"
              >
                <Send className="size-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
