"use client"

import { ArrowDownLeft, ArrowUpRight, Gift, Plus, Repeat, Send, Undo2 } from "lucide-react"
import Link from "next/link"

import { ClientDate } from "@/components/client-date"
import { StatusBadge } from "@/components/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatMoney } from "@/lib/format"
import { useAuth } from "@/lib/use-auth"
import { cn } from "@/lib/utils"

const typeMeta = {
  deposit: { label: "Deposit", icon: ArrowDownLeft, className: "text-primary" },
  purchase: { label: "Purchase", icon: ArrowUpRight, className: "text-muted-foreground" },
  refund: { label: "Refund", icon: Undo2, className: "text-primary" },
  referral: { label: "Referral", icon: Gift, className: "text-primary" },
  transfer: { label: "Transfer", icon: Send, className: "text-muted-foreground" },
} as const

export default function TransactionsPage() {
  const { transactions } = useAuth()

  const totalDeposits = transactions
    .filter((txn) => txn.type === "deposit")
    .reduce((sum, txn) => sum + txn.amount, 0)
  const totalSpent = transactions
    .filter((txn) => txn.type === "purchase")
    .reduce((sum, txn) => sum + Math.abs(txn.amount), 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="type-title text-xl text-foreground">Transactions</h2>
        <Link
          href="/dashboard/deposit"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#5362AD] px-4 py-2 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(83,98,173,0.35)] hover:bg-[#4351a0]"
        >
          <Plus className="size-3.5" />
          Deposit
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-[16px] border border-[#5362AD]/20 bg-[#5362AD]/10 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-primary/80">
            Total Deposited
          </p>
          <p className="mt-1.5 text-lg font-semibold tracking-tight text-primary">
            {formatMoney(totalDeposits)}
          </p>
        </div>
        <div className="rounded-[16px] border border-border bg-muted p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Total Spent
          </p>
          <p className="mt-1.5 text-lg font-semibold tracking-tight text-foreground">
            {formatMoney(totalSpent)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-border bg-card">
        <div className="border-b border-border bg-card px-5 py-4">
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            Transaction History
          </h3>
          <p className="text-xs text-muted-foreground">{transactions.length} transactions total</p>
        </div>

        {transactions.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-muted ring-1 ring-white/10">
              <Repeat className="size-6 text-muted-foreground" />
            </span>
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any transactions yet.
            </p>
          </div>
        ) : (
          <Table className="thead-material">
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Type</TableHead>
                <TableHead className="text-muted-foreground">Description</TableHead>
                <TableHead className="text-muted-foreground">Amount</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((txn) => {
                const meta = typeMeta[txn.type as keyof typeof typeMeta] ?? typeMeta.transfer
                const Icon = meta.icon
                const isPositive = txn.amount >= 0
                return (
                  <TableRow key={txn.id} className="border-border hover:bg-muted">
                    <TableCell>
                      <div className={cn("flex items-center gap-1.5 text-sm font-medium", meta.className)}>
                        <Icon className="size-3.5" />
                        {meta.label}
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">{txn.description}</TableCell>
                    <TableCell
                      className={cn(
                        "font-medium",
                        isPositive ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {isPositive ? "+" : "-"}
                      {formatMoney(Math.abs(txn.amount))}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={txn.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <ClientDate iso={txn.createdAt} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
