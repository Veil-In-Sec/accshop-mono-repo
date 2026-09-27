"use client"

import { MessageCircle, Send, X } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import useSWR from "swr"

import { getSupportMessages, getSupportUnreadCount, sendSupportMessage } from "@/app/actions/support"
import { getSiteSettings } from "@/app/actions/wallet"
import type { SupportMessage } from "@/lib/api/types"

const QUICK_REPLIES = ["Order status", "Payment help", "Replacement"]

export function SupportChat() {
  const [open, setOpen] = React.useState(false)
  const [input, setInput] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const listRef = React.useRef<HTMLDivElement>(null)

  const { data: unread } = useSWR("support-unread", getSupportUnreadCount, {
    refreshInterval: 8000,
    revalidateOnFocus: true,
  })

  const {
    data: serverMessages,
    mutate,
    isLoading,
  } = useSWR(open ? "support-messages" : null, getSupportMessages, {
    refreshInterval: 4000,
    revalidateOnFocus: true,
  })

  const [local, setLocal] = React.useState<SupportMessage[]>([])
  const messages = React.useMemo(() => {
    const merged = [...(serverMessages ?? []), ...local]
    return merged.sort((a, b) => a.id - b.id)
  }, [serverMessages, local])

  // Drop optimistic messages once the server echoes them back.
  React.useEffect(() => {
    if (!serverMessages || local.length === 0) return
    setLocal((prev) =>
      prev.filter((l) => !serverMessages.some((s) => s.text === l.text && s.sender === "customer")),
    )
  }, [serverMessages, local.length])

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, open])

  const { data: settings } = useSWR(open ? "site-settings" : null, getSiteSettings)
  const rawSupportUrl = settings?.supportUrl?.trim() || "https://t.me/accshop"
  // Allow only http(s) links — admin-editable setting must not become javascript: XSS.
  const supportUrl = /^https?:\/\//i.test(rawSupportUrl) ? rawSupportUrl : "https://t.me/accshop"

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    const temp: SupportMessage = {
      id: Date.now(),
      userId: "",
      sender: "customer",
      text: trimmed,
      read: false,
      createdAt: new Date().toISOString(),
    }
    setLocal((prev) => [...prev, temp])
    setInput("")
    try {
      await sendSupportMessage(trimmed)
      await mutate()
    } catch {
      setLocal((prev) => prev.filter((m) => m.id !== temp.id))
      toast.error("Could not send message. Please try again.")
    } finally {
      setSending(false)
    }
  }

  const unreadCount = open ? 0 : (unread?.unread ?? 0)

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex w-[calc(100vw-3rem)] max-w-[340px] flex-col overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
          <div className="flex items-center gap-3 bg-[#5362AD] px-4 py-3">
            <div className="relative flex size-9 items-center justify-center rounded-full bg-white/15 text-white">
              <MessageCircle className="size-5" />
              <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#5362AD] bg-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">Live support</p>
              <p className="text-[11px] text-white/80">Chat directly with our admin team</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="flex size-8 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>

          <div ref={listRef} data-lenis-prevent className="flex h-72 flex-col gap-2 overflow-y-auto overscroll-contain p-4">
            {isLoading && messages.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Loading conversation…</p>
            ) : messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                <p className="text-[13px] text-foreground">No messages yet.</p>
                <p className="max-w-[240px] text-xs text-muted-foreground">
                  Say hi — an admin will reply here. Include your order ID for faster help.
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === "customer" ? "justify-end" : "justify-start"}`}>
                  <p
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                      m.sender === "customer"
                        ? "rounded-br-md bg-[#5362AD] text-white"
                        : "rounded-bl-md bg-muted text-foreground"
                    }`}
                  >
                    {m.text}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 px-4 pb-2">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                disabled={sending}
                className="rounded-full border border-border bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground hover:bg-[#5362AD]/30 hover:text-primary disabled:opacity-40 dark:hover:text-white"
              >
                {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message…"
              aria-label="Chat message"
              maxLength={2000}
              className="h-10 flex-1 rounded-full bg-muted px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={!input.trim() || sending}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#5362AD] text-white hover:bg-[#4351a0] disabled:opacity-40"
            >
              <Send className="size-4" />
            </button>
          </form>

          <a
            href={supportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="border-t border-border px-4 py-2.5 text-center text-[11px] font-medium text-primary hover:underline"
          >
            Prefer Telegram / external support? Open support center
          </a>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close live chat" : "Open live chat support"}
        className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-[#5362AD] text-white shadow-[0_8px_24px_rgba(83,98,173,0.4),0_2px_8px_rgba(0,0,0,0.4)] ring-1 ring-border transition-transform hover:scale-105 hover:bg-[#4351a0]"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
        {!open && unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-bold text-[#0d0d15]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </>
  )
}
