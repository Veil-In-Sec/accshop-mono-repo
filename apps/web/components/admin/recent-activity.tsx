"use client"

import {
  ArrowLeftRight,
  Clock3,
  Gift,
  Receipt,
  ShoppingCart,
  SlidersHorizontal,
} from "lucide-react"
import useSWR from "swr"

import { getRecentActivity } from "@/app/actions/admin"
import { ClientDate } from "@/components/client-date"

const kindMeta: Record<string, { label: string; Icon: React.ComponentType<{ className?: string }> }> = {
  deposit: { label: "Deposit credited", Icon: Gift },
  deposit_request: { label: "Deposit request", Icon: Clock3 },
  purchase: { label: "Purchase", Icon: ShoppingCart },
  refund: { label: "Refund", Icon: ArrowLeftRight },
  transfer: { label: "Transfer", Icon: ArrowLeftRight },
  adjustment: { label: "Admin adjustment", Icon: SlidersHorizontal },
}

export function RecentActivity() {
  const { data: events } = useSWR("recent-activity", () => getRecentActivity(8), {
    refreshInterval: 10000,
    revalidateOnFocus: true,
  })
  const list = events ?? []

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-base font-semibold text-foreground">Recent activity</h2>
      <ul className="mt-4 flex flex-col divide-y divide-border">
        {list.map((event, index) => {
          const meta = kindMeta[event.kind] ?? { label: event.kind, Icon: Receipt }
          return (
            <li key={`${event.kind}-${index}`} className="flex items-center gap-3 py-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <meta.Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">
                  {meta.label} — <span className="text-muted-foreground">{event.userEmail}</span>
                  {event.pending && (
                    <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                      awaiting review
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  <ClientDate iso={event.createdAt} />
                </p>
              </div>
              <span
                className={`shrink-0 font-mono text-sm ${
                  event.kind === "purchase" ? "text-destructive" : "text-[#8b9bff]"
                }`}
              >
                {event.amount < 0 ? "−" : "+"}BDT {Math.abs(event.amount).toFixed(2)}
              </span>
            </li>
          )
        })}
        {list.length === 0 && (
          <li className="py-6 text-center text-sm text-muted-foreground">
            No activity yet — it will appear here as customers buy and deposit.
          </li>
        )}
      </ul>
    </div>
  )
}
