"use client"

import * as React from "react"
import { toast } from "sonner"
import useSWR from "swr"

import { listAllDeposits, reviewDepositAction } from "@/app/actions/deposits"
import { ClientDate } from "@/components/client-date"
import { StatusBadge } from "@/components/status-badge"
import { formatMoney } from "@/lib/format"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type AdminDeposit = {
  id: number
  userId: string
  userEmail: string
  paymentMethodId: number | null
  paymentMethod: string
  amount: number
  currency: string
  senderAccountNumber: string
  transactionReference: string
  status: string
  adminNote: string
  createdAt: string
  reviewedAt: string | null
}

export function DepositsTable({ initialDeposits }: { initialDeposits: AdminDeposit[] }) {
  const [filter, setFilter] = React.useState<"all" | "pending" | "approved" | "rejected">("pending")

  // Live list — refreshes every 5s so new requests appear without a page reload.
  const { data: deposits = [], mutate } = useSWR("admin-deposits", () => listAllDeposits(), {
    fallbackData: initialDeposits,
    refreshInterval: 5000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })
  const [reviewing, setReviewing] = React.useState<AdminDeposit | null>(null)
  const [decision, setDecision] = React.useState<"approved" | "rejected">("approved")
  const [note, setNote] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  const filtered = React.useMemo(() => {
    if (filter === "all") return deposits
    return deposits.filter((d) => d.status === filter)
  }, [deposits, filter])

  const pendingCount = deposits.filter((d) => d.status === "pending").length

  function openReview(row: AdminDeposit, next: "approved" | "rejected") {
    setReviewing(row)
    setDecision(next)
    setNote("")
  }

  async function handleConfirm() {
    if (!reviewing) return
    setSaving(true)
    const result = await reviewDepositAction(reviewing.id, decision, note)
    setSaving(false)
    if (result.success) {
      toast.success(result.message || `Deposit ${decision}.`)
      setReviewing(null)
      await mutate()
    } else {
      toast.error(result.message || "Failed to review deposit.")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={cn(
              "pressable rounded-full px-4 py-1.5 text-xs font-medium capitalize transition-colors",
              filter === s
                ? "bg-white text-zinc-900 shadow-sm"
                : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white",
            )}
          >
            {s}
            {s === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        ))}
        <span className="ml-auto text-xs text-zinc-500">
          {filtered.length} request{filtered.length === 1 ? "" : "s"} • approving credits the
          wallet instantly
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {filtered.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">
            No {filter === "all" ? "" : `${filter} `}deposit requests.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="thead-material">
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Sender No.</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">#{row.id}</TableCell>
                    <TableCell className="max-w-[180px] truncate text-sm">
                      {row.userEmail}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatMoney(row.amount)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.paymentMethod || (row.paymentMethodId ? `#${row.paymentMethodId}` : "—")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-foreground">
                      {row.senderAccountNumber || "—"}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate font-mono text-xs">
                      {row.transactionReference}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      <ClientDate iso={row.createdAt} />
                    </TableCell>
                    <TableCell className="text-right">
                      {row.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => openReview(row, "approved")}>
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openReview(row, "rejected")}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {row.adminNote ? `Note: ${row.adminNote}` : "Reviewed"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={!!reviewing} onOpenChange={(open) => !open && setReviewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision === "approved" ? "Approve" : "Reject"} deposit #{reviewing?.id}?
            </DialogTitle>
          </DialogHeader>
          {reviewing && (
            <div className="flex flex-col gap-3 text-sm">
              <p className="text-muted-foreground">
                {reviewing.userEmail} • BDT {Number(reviewing.amount).toFixed(2)} •{" "}
                {reviewing.transactionReference}
                {reviewing.senderAccountNumber ? (
                  <> • Sender: <span className="font-mono text-foreground">{reviewing.senderAccountNumber}</span></>
                ) : null}
              </p>
              {decision === "approved" && (
                <p className="rounded-lg bg-[#5362AD]/10 px-3 py-2 text-xs text-[#8b9bff] ring-1 ring-[#5362AD]/20">
                  Approving will credit BDT {Number(reviewing.amount).toFixed(2)} to the
                  customer&apos;s wallet immediately.
                </p>
              )}
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  decision === "approved"
                    ? "Admin note (optional)"
                    : "Reason for rejection (shown to customer)"
                }
                rows={3}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewing(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={saving}>
              {saving ? "Saving..." : decision === "approved" ? "Approve & credit" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
