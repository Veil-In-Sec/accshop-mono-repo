"use client"

import { Bell, CheckCheck, PackageCheck } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import useSWR from "swr"

import {
  getNotifications,
  getNotificationsUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/notifications"

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function NotificationsBell() {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  const { data: unread } = useSWR("notifications-unread", getNotificationsUnreadCount, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
  })
  const { data: list, mutate } = useSWR(
    open ? "notifications-list" : null,
    getNotifications,
    { refreshInterval: 10000, revalidateOnFocus: true },
  )

  const unreadCount = open ? 0 : (unread?.unread ?? 0)

  React.useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open ])

  async function openPanel() {
    const next = !open
    setOpen(next)
    if (next) {
      await markAllNotificationsRead()
      mutate()
    }
  }

  async function openItem(id: number, read: boolean) {
    if (!read) {
      await markNotificationRead(id)
      mutate()
    }
  }

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        aria-label="Notifications"
        onClick={openPanel}
        className="relative flex items-center justify-center w-10 h-10 rounded-full bg-[#1b1b23] text-[#c6c5d2] hover:text-[#e4e1ed] hover:bg-[#292932] transition-colors"
      >
        <Bell className="size-5" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-5 text-white shadow-[0_0_10px_rgba(239,68,68,0.7)]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : (
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#5362AD] shadow-[0_0_8px_rgba(83,98,173,0.8)]" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+12px)] w-80 rounded-2xl border border-white/10 bg-[#1b1b23] shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <p className="text-sm font-semibold text-white">Notifications</p>
            <span className="inline-flex items-center gap-1 text-[11px] text-[#8f909c]">
              <CheckCheck className="size-3.5" /> Auto-read on open
            </span>
          </div>
          <div data-lenis-prevent className="max-h-80 overflow-y-auto overscroll-contain p-2">
            {(list ?? []).map((n) => (
              <Link
                key={n.id}
                href="/dashboard/orders"
                onClick={() => openItem(n.id, n.read)}
                className={`flex gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 ${n.read ? "" : "bg-[#5362AD]/10"}`}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                  <PackageCheck className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-white truncate">{n.title}</span>
                    {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-red-500" />}
                  </span>
                  <span className="block truncate text-xs text-[#c6c5d2]">{n.body}</span>
                  <span className="mt-0.5 block text-[10px] text-[#8f909c]">{timeAgo(n.createdAt)}</span>
                </span>
              </Link>
            ))}
            {(list ?? []).length === 0 && (
              <p className="px-3 py-8 text-center text-xs text-[#8f909c]">
                No notifications yet. Order updates will appear here.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
