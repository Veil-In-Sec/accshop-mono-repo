"use client"

import { CheckCircle2, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

type Tone = "success" | "waiting" | "danger" | "muted"

function toneFor(status: string): Tone {
  const s = (status ?? "").toString().toLowerCase()
  if (s === "completed" || s === "approved") return "success"
  if (s === "processing" || s === "pending") return "waiting"
  if (s === "failed" || s === "rejected") return "danger"
  return "muted"
}

const toneClass: Record<Tone, string> = {
  success: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/20",
  waiting: "bg-amber-500/15 text-amber-400 ring-amber-500/20",
  danger: "bg-red-500/15 text-red-400 ring-red-500/20",
  muted: "bg-white/5 text-zinc-400 ring-white/10",
}

/**
 * Single shared status pill for orders, deposits and transactions.
 * Add new statuses to `toneFor` instead of copy-pasting badge markup.
 */
export function StatusBadge({ status, className }: { status?: string | null; className?: string }) {
  const tone = toneFor(status ?? "")
  const label = (status ?? "unknown").toString()
  const display = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1",
        toneClass[tone],
        className,
      )}
    >
      {tone === "success" && <CheckCircle2 className="size-3" />}
      {tone === "waiting" && <Loader2 className="size-3 animate-spin" />}
      {display}
    </span>
  )
}
