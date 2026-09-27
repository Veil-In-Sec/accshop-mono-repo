"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { adjustUserBalance, deleteUser, replySupportMessage } from "@/app/actions/admin"
import { reviewDepositAction } from "@/app/actions/deposits"
import { ClientDate } from "@/components/client-date"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { formatMoney } from "@/lib/format"
import type { AdminUserDetails } from "@/lib/api/types"

type Tab = "orders" | "transactions" | "deposits" | "support" | "sessions"

export function UserDashboard({ details }: { details: AdminUserDetails }) {
  const router = useRouter()
  const [tab, setTab] = React.useState<Tab>("orders")
  const [adjustAmount, setAdjustAmount] = React.useState("")
  const [adjustNote, setAdjustNote] = React.useState("")
  const [adjusting, setAdjusting] = React.useState(false)
  const [reply, setReply] = React.useState("")
  const [replying, setReplying] = React.useState(false)
  const [messages, setMessages] = React.useState(details.support.recent)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  const { user, wallet, stats } = details

  async function handleAdjust() {
    const amount = Number(adjustAmount)
    if (!Number.isFinite(amount) || amount === 0) {
      toast.error("Enter a non-zero amount (negative to deduct).")
      return
    }
    setAdjusting(true)
    const result = await adjustUserBalance(user.id, amount, adjustNote || undefined)
    setAdjusting(false)
    if (!result.success) {
      toast.error(result.message ?? "Could not adjust balance.")
      return
    }
    toast.success(result.message ?? "Balance updated.")
    setAdjustAmount("")
    setAdjustNote("")
    router.refresh()
  }

  async function handleReply() {
    const text = reply.trim()
    if (!text) {
      toast.error("Write a reply first.")
      return
    }
    setReplying(true)
    const result = await replySupportMessage(user.id, text)
    setReplying(false)
    if (!result.success) {
      toast.error("Could not send reply.")
      return
    }
    setMessages((prev) => [...prev, result.message])
    setReply("")
    toast.success("Reply sent.")
    router.refresh()
  }

  async function handleReviewDeposit(id: number, decision: "approved" | "rejected") {
    const result = await reviewDepositAction(id, decision)
    if (!result.success) {
      toast.error(result.message)
      return
    }
    toast.success(result.message)
    router.refresh()
  }

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteUser(user.id)
    setDeleting(false)
    if (!result.success) {
      toast.error(result.message ?? "Could not delete user.")
      return
    }
    toast.success(result.message ?? "User deleted.")
    router.push("/admin/users")
    router.refresh()
  }

  const statCards = [
    { label: "Wallet balance", value: formatMoney(wallet.balance) },
    { label: "Total spent", value: formatMoney(stats.totalSpent) },
    { label: "Total deposited", value: formatMoney(stats.totalDeposited) },
    { label: "Orders", value: `${stats.completedOrders}/${stats.totalOrders} completed` },
    { label: "Pending deposits", value: String(stats.pendingDeposits) },
    { label: "Unread support", value: String(stats.unreadSupport) },
  ]

  const tabs: Array<{ id: Tab; label: string; count?: number }> = [
    { id: "orders", label: "Orders", count: details.orders.length },
    { id: "transactions", label: "Transactions", count: details.transactions.length },
    { id: "deposits", label: "Deposits", count: details.deposits.length },
    { id: "support", label: "Support", count: details.support.total },
    { id: "sessions", label: "Sessions", count: details.sessions.length },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Profile header */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-[#5362AD]/20 text-xl font-bold text-primary">
              {(user.name || user.email || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{user.name}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Joined <ClientDate iso={user.createdAt} /></span>
                {wallet.referralCode && <span className="font-mono">Ref: {wallet.referralCode}</span>}
                {wallet.referredBy && <span>Referred by <span className="font-mono">{wallet.referredBy}</span></span>}
              </div>
            </div>
          </div>
          <div>
            {confirmDelete ? (
              <div className="flex gap-2">
                <Button variant="destructive" size="sm" disabled={deleting} onClick={handleDelete}>
                  {deleting ? "Deleting…" : "Confirm delete"}
                </Button>
                <Button variant="ghost" size="sm" disabled={deleting} onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)}>
                Delete user
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {statCards.map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-background px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Balance adjust */}
        <div className="mt-5 flex flex-col gap-2 rounded-lg border border-border bg-background p-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="adjust-amount" className="text-xs font-medium text-muted-foreground">
              Adjust balance (use negative to deduct)
            </label>
            <input
              id="adjust-amount"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              placeholder="e.g. 50 or -20"
              inputMode="decimal"
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
            />
          </div>
          <div className="flex-[2]">
            <label htmlFor="adjust-note" className="text-xs font-medium text-muted-foreground">
              Note (optional)
            </label>
            <input
              id="adjust-note"
              value={adjustNote}
              onChange={(e) => setAdjustNote(e.target.value)}
              placeholder="Reason shown in transaction history"
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
            />
          </div>
          <Button onClick={handleAdjust} disabled={adjusting} className="sm:w-auto">
            {adjusting ? "Saving…" : "Apply"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition-colors ${tab === t.id ? "bg-white text-zinc-900 shadow-sm" : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white"}`}
          >
            {t.label}{t.count != null ? ` (${t.count})` : ""}
          </button>
        ))}
        <Link href="/admin/users" className="ml-auto text-xs text-muted-foreground hover:text-foreground hover:underline">
          ← All users
        </Link>
      </div>

      {/* Tab panels */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {tab === "orders" && (
          details.orders.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="thead-material">
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">
                        <Link href={`/admin/orders/${o.id}`} className="hover:text-primary hover:underline">#{o.id}</Link>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{o.productName} <span className="text-muted-foreground">×{o.quantity}</span></TableCell>
                      <TableCell className="text-right font-semibold">{formatMoney(o.total)}</TableCell>
                      <TableCell><StatusBadge status={o.status} /></TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{o.supplier}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground"><ClientDate iso={o.purchasedAt} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        )}

        {tab === "transactions" && (
          details.transactions.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="thead-material">
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance after</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">#{t.id}</TableCell>
                      <TableCell className="capitalize text-foreground">{t.type}</TableCell>
                      <TableCell className="max-w-[260px] truncate text-muted-foreground">{t.description || "—"}</TableCell>
                      <TableCell className={`text-right font-semibold ${Number(t.amount) < 0 ? "text-red-400" : "text-emerald-400"}`}>
                        {Number(t.amount) < 0 ? "−" : "+"}{formatMoney(Math.abs(Number(t.amount)))}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatMoney(t.balanceAfter)}</TableCell>
                      <TableCell><StatusBadge status={t.status} /></TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground"><ClientDate iso={t.createdAt} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        )}

        {tab === "deposits" && (
          details.deposits.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">No deposit requests yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="thead-material">
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.deposits.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">#{d.id}</TableCell>
                      <TableCell className="text-right font-semibold">{formatMoney(d.amount)}</TableCell>
                      <TableCell className="max-w-[200px] truncate font-mono text-xs">{d.transactionReference}</TableCell>
                      <TableCell><StatusBadge status={d.status} /></TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground"><ClientDate iso={d.createdAt} /></TableCell>
                      <TableCell className="text-right">
                        {d.status === "pending" ? (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" onClick={() => handleReviewDeposit(d.id, "approved")}>Approve</Button>
                            <Button size="sm" variant="outline" onClick={() => handleReviewDeposit(d.id, "rejected")}>Reject</Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">{d.adminNote || "Reviewed"}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        )}

        {tab === "support" && (
          <div className="flex flex-col gap-4 p-5">
            {messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No support messages from this user.</p>
            ) : (
              <div className="flex max-h-[420px] flex-col gap-2 overflow-y-auto">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${m.sender === "admin" ? "self-end bg-[#5362AD] text-white" : "self-start border border-border bg-background text-foreground"}`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    <p className={`mt-1 text-[10px] ${m.sender === "admin" ? "text-white/70" : "text-muted-foreground"}`}>
                      <ClientDate iso={m.createdAt} /> • {m.sender}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={`Reply to ${user.email}…`}
                rows={3}
              />
              <div className="flex justify-end">
                <Button onClick={handleReply} disabled={replying}>
                  {replying ? "Sending…" : "Send reply"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {tab === "sessions" && (
          details.sessions.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">No sessions recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="thead-material">
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.sessions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${s.active ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/20" : "bg-white/5 text-zinc-400 ring-white/10"}`}>
                          {s.active ? "Active" : "Expired"}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{s.ipAddress || "—"}</TableCell>
                      <TableCell className="max-w-[320px] truncate text-xs text-muted-foreground">{s.userAgent || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground"><ClientDate iso={s.createdAt} /></TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground"><ClientDate iso={s.expiresAt} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        )}
      </div>
    </div>
  )
}
