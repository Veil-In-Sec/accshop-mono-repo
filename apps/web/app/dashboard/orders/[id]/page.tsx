"use client"

import { ArrowLeft, Copy, Download, Loader2, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { toast } from "sonner"

import { useAuth } from "@/lib/use-auth"
import { ClientDate } from "@/components/client-date"
import { copyToClipboard } from "@/lib/clipboard"
import { formatLineTotal } from "@/lib/format"
import { exportCredentialsTxt, parseCredentialAccounts, toPipeLine, PIPE_FORMAT_HINT } from "@/lib/credentials"

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { orders, isLoading } = useAuth()

  const order = orders.find((o) => o.id === id)

  const accounts = parseCredentialAccounts({
    deliveredCredentials: order?.deliveredCredentials,
    deliveredEmail: order?.deliveredEmail,
    deliveredPassword: order?.deliveredPassword,
    deliveredRefreshToken: order?.deliveredRefreshToken,
    deliveredClientId: order?.deliveredClientId,
  })

  async function copyLine(line: string) {
    if (!line) return
    const ok = await copyToClipboard(line)
    if (ok) toast.success("Line copied.")
    else toast.error("Could not copy to clipboard.")
  }

  async function copyAll() {
    if (accounts.length === 0) return
    const ok = await copyToClipboard(accounts.map(toPipeLine).join("\n"))
    if (ok) toast.success(`${accounts.length} line${accounts.length === 1 ? "" : "s"} copied.`)
    else toast.error("Could not copy to clipboard.")
  }

  function exportTxt() {
    if (!order || accounts.length === 0) return
    exportCredentialsTxt(
      `${order.productName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}-credentials.txt`,
      accounts,
    )
    toast.success("TXT exported.")
  }

  if (isLoading) {
    return (
      <div key={id} className="flex flex-col gap-6">
        <Link href="/dashboard/orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to orders
        </Link>
        <p className="text-muted-foreground">Loading order…</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div key={id} className="flex flex-col gap-6">
        <Link href="/dashboard/orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to orders
        </Link>
        <p className="text-muted-foreground">Order not found.</p>
      </div>
    )
  }

  return (
    <div key={id} className="flex flex-col gap-5">
      <Link href="/dashboard/orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to orders
      </Link>

      <div>
        <h1 className="type-title text-xl text-foreground">Order Details</h1>
        <p className="mt-1 text-sm text-muted-foreground">Credentials for your purchased product.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-muted-foreground">Product</h2>
        <p className="mt-1 text-base font-semibold text-foreground">{order.productName}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">Qty</p>
            <p className="font-medium text-foreground">{order.quantity ?? 1}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total</p>
            <p className="font-medium text-foreground">{formatLineTotal(order.price ?? 0, order.quantity)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            {(() => {
              const s = (order.status ?? "").toString().toLowerCase()
              if (s === "completed") return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                  <CheckCircle2 className="size-3" />
                  Completed
                </span>
              )
              if (s === "processing" || s === "pending") return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
                  <Loader2 className="size-3 animate-spin text-amber-400" />
                  Processing
                </span>
              )
              if (s === "failed") return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">
                  Failed
                </span>
              )
              return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground capitalize">
                  {order.status ?? "unknown"}
                </span>
              )
            })()}
          </div>
          <div>
            <p className="text-muted-foreground">Date</p>
            <p className="font-medium text-foreground"><ClientDate iso={order.purchasedAt} /></p>
          </div>
        </div>
      </div>

      {order.status === "completed" ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Credentials ({accounts.length})
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyAll}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
              >
                <Copy className="size-3" />
                Copy all
              </button>
              <button
                type="button"
                onClick={exportTxt}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
              >
                <Download className="size-3" />
                TXT
              </button>
            </div>
          </div>
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">{PIPE_FORMAT_HINT}</p>

          <div className="mt-2 flex flex-col gap-2">
            {accounts.map((acc, i) => {
              const line = toPipeLine(acc)
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5"
                >
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{i + 1}</span>
                  <code className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">{line}</code>
                  <button
                    type="button"
                    onClick={() => void copyLine(line)}
                    aria-label={`Copy line ${i + 1}`}
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-5 text-center">
          <p className="text-sm text-muted-foreground">Credentials will appear here once the order is delivered.</p>
        </div>
      )}
    </div>
  )
}
