"use client"

import { cn } from "@/lib/utils"

/**
 * Shared pager footer — Prev/Next + "Page x of y · N {unit}".
 * Neutral dark styling fits admin cards and dashboard panels alike.
 */
export function Pager({
  page,
  totalPages,
  total,
  unit,
  onPage,
  className,
}: {
  page: number
  totalPages: number
  total: number
  unit: string
  onPage: (page: number) => void
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 px-5 py-3 text-xs text-muted-foreground", className)}>
      <span>
        Page {page} of {totalPages} · {total.toLocaleString()} {unit}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPage(Math.max(1, page - 1))}
          className="pressable rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-medium text-zinc-300 hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
        >
          Prev
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="pressable rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 font-medium text-zinc-300 hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}
