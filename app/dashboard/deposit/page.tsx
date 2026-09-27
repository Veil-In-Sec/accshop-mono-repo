"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Copy, Wallet } from "lucide-react"
import { toast } from "sonner"

import { getDepositPrereqs, getMyDeposits, submitDepositAction } from "@/app/actions/deposits"
import { Button } from "@/components/ui/button"
import { ClientDate } from "@/components/client-date"
import { copyToClipboard } from "@/lib/clipboard"
import { StatusBadge } from "@/components/status-badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { useCurrencySymbol } from "@/lib/use-currency"
import { cn } from "@/lib/utils"

type PaymentMethod = {
  id: number
  name: string
  type: string
  accountNumber?: string
  accountName?: string
  instructions?: string
  icon?: string
}

type DepositRow = {
  id: number
  amount: number
  currency?: string
  status: string
  paymentMethodId?: number | null
  paymentMethod?: string
  senderAccountNumber?: string
  transactionReference: string
  adminNote?: string
  createdAt: string
}

const QUICK_AMOUNTS = [100, 500, 1000, 5000]

export default function DepositPage() {
  const { balance, refresh } = useAuth()
  const { currencySymbol } = useCurrencySymbol()

  const [methods, setMethods] = React.useState<PaymentMethod[]>([])
  const [minDeposit, setMinDeposit] = React.useState(5)
  const [loading, setLoading] = React.useState(true)
  const [history, setHistory] = React.useState<DepositRow[]>([])
  const [historyLoading, setHistoryLoading] = React.useState(true)

  const [selectedMethodId, setSelectedMethodId] = React.useState<number | null>(null)
  const [amount, setAmount] = React.useState("")
  const [senderAccount, setSenderAccount] = React.useState("")
  const [transactionRef, setTransactionRef] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [copied, setCopied] = React.useState<string | null>(null)

  const selectedMethod = methods.find((m) => m.id === selectedMethodId)

  const loadHistory = React.useCallback(async () => {
    setHistoryLoading(true)
    try {
      const rows = await getMyDeposits()
      setHistory(rows as DepositRow[])
    } catch {
      /* keep previous history on error */
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  React.useEffect(() => {
    getDepositPrereqs()
      .then(({ methods: list, settings }) => {
        setMethods(list ?? [])
        if (settings && Number.isFinite(Number(settings.minDepositUsd))) {
          setMinDeposit(Number(settings.minDepositUsd))
        }
      })
      .catch(() => {
        toast.error("Could not load payment methods.")
      })
      .finally(() => setLoading(false))
    loadHistory()
    // Live history — picks up approvals without a page reload.
    // 30s (not 10s) to avoid request storms alongside SWR polling.
    const id = setInterval(loadHistory, 30000)
    return () => clearInterval(id)
  }, [loadHistory])

  async function handleCopy(text: string, label: string) {
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopied(label)
      toast.success(`${label} copied!`)
      setTimeout(() => setCopied(null), 2000)
    } else {
      toast.error("Could not copy to clipboard.")
    }
  }

  async function handleSubmit() {
    const parsed = Number(amount)
    if (!selectedMethodId) {
      toast.error("Please select a payment method.")
      return
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Enter an amount greater than zero.")
      return
    }
    if (parsed < minDeposit) {
      toast.error(`Minimum deposit is ${formatMoney(minDeposit)}.`)
      return
    }
    if (!senderAccount.trim()) {
      toast.error("Please enter your sender account number.")
      return
    }
    if (!transactionRef.trim()) {
      toast.error("Please enter the transaction reference.")
      return
    }
    setSubmitting(true)
    const result = await submitDepositAction({
      paymentMethodId: selectedMethodId,
      amount: parsed,
      senderAccountNumber: senderAccount.trim(),
      transactionReference: transactionRef.trim(),
    })
    setSubmitting(false)
    if (result.success) {
      toast.success(result.message || "Deposit request submitted. It will be reviewed shortly.")
      setAmount("")
      setSenderAccount("")
      setTransactionRef("")
      await loadHistory()
      await refresh()
    } else {
      toast.error(result.message || "Failed to submit deposit.")
    }
  }

  const pendingCount = history.filter((h) => h.status === "pending").length

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link
        href="/dashboard"
        className="pressable inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit rounded-lg"
      >
        <ArrowLeft className="size-4" />
        Back to dashboard
      </Link>

      <div>
        <h1 className="type-title text-xl text-foreground">Deposit Funds</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Send payment to one of our accounts, then submit the details below. Admin reviews and
          credits your wallet.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-[16px] border border-[#5362AD]/20 bg-[#5362AD]/10 p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary/80">
            <Wallet className="size-3.5" />
            Current Balance
          </p>
          <p className="mt-1.5 text-lg font-semibold tracking-tight text-primary">
            {formatMoney(balance)}
          </p>
        </div>
        <div className="rounded-[16px] border border-border bg-muted p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Min Deposit</p>
          <p className="mt-1.5 text-lg font-semibold tracking-tight text-foreground">
            {formatMoney(minDeposit)}
          </p>
        </div>
        <div className="rounded-[16px] border border-border bg-muted p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Pending Requests
          </p>
          <p className="mt-1.5 text-lg font-semibold tracking-tight text-foreground">{pendingCount}</p>
        </div>
      </div>

      <div className="rounded-[20px] border border-border bg-card p-5">
        <h2 className="text-sm font-medium text-muted-foreground">1. Select Payment Method</h2>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading payment methods...</p>
        ) : methods.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No payment methods available. Please contact support.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {methods.map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => setSelectedMethodId(method.id)}
                className={cn(
                  "pressable flex items-center justify-between rounded-xl border p-4 text-left transition-colors",
                  selectedMethodId === method.id
                    ? "border-[#5362AD] bg-[#5362AD]/10"
                    : "border-border hover:border-border bg-muted",
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {method.icon ? (
                    <img
                      src={method.icon}
                      alt={`${method.name} logo`}
                      className="size-9 shrink-0 rounded-lg border border-border bg-white object-contain"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{method.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{method.type}</p>
                  </div>
                </div>
                <div
                  className={cn(
                    "size-4 rounded-full border-2",
                    selectedMethodId === method.id
                      ? "border-[#5362AD] bg-[#5362AD]"
                      : "border-zinc-600",
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedMethod && (
        <div className="rounded-[20px] border border-border bg-card p-5">
          <h2 className="text-sm font-medium text-muted-foreground">2. Send Payment</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Send your deposit to the account below, then fill in step 3 with your payment proof.
          </p>
          <div className="mt-4 flex flex-col gap-3">
            {selectedMethod.accountNumber && (
              <div className="flex items-center justify-between rounded-xl bg-muted border border-border px-3 py-2">
                <div>
                  <p className="text-[11px] text-muted-foreground">Account Number</p>
                  <p className="text-sm font-medium text-foreground">{selectedMethod.accountNumber}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopy(selectedMethod.accountNumber!, "Account number")}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Copy account number"
                >
                  {copied === "Account number" ? (
                    <CheckCircle2 className="size-4 text-primary" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </button>
              </div>
            )}
            {selectedMethod.accountName && (
              <div className="flex items-center justify-between rounded-xl bg-muted border border-border px-3 py-2">
                <div>
                  <p className="text-[11px] text-muted-foreground">Account Name</p>
                  <p className="text-sm font-medium text-foreground">{selectedMethod.accountName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopy(selectedMethod.accountName!, "Account name")}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Copy account name"
                >
                  {copied === "Account name" ? (
                    <CheckCircle2 className="size-4 text-primary" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </button>
              </div>
            )}
            {selectedMethod.instructions && (
              <div className="rounded-xl bg-muted border border-border px-3 py-2">
                <p className="text-[11px] text-muted-foreground">Instructions</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{selectedMethod.instructions}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-[20px] border border-border bg-card p-5">
        <h2 className="text-sm font-medium text-muted-foreground">3. Submit Deposit Proof</h2>
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deposit-amount" className="text-muted-foreground">
              Amount ({currencySymbol}) — min {formatMoney(minDeposit)} *
            </Label>
            <Input
              id="deposit-amount"
              type="number"
              min={0}
              step="0.01"
              placeholder={`e.g. ${minDeposit.toFixed(2)}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-[#5362AD]/50 focus-visible:ring-[#5362AD]/20"
            />
            <div className="mt-1 flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(q))}
                  className={cn(
                    "pressable rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    Number(amount) === q
                      ? "bg-[#5362AD] text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {currencySymbol}
                  {q}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deposit-txn" className="text-muted-foreground">
              Transaction Reference *
            </Label>
            <Input
              id="deposit-txn"
              placeholder="Enter the transaction ID / reference from your payment"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-[#5362AD]/50 focus-visible:ring-[#5362AD]/20"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deposit-sender" className="text-muted-foreground">
              Sender Account Number *
            </Label>
            <Input
              id="deposit-sender"
              required
              placeholder="Your account number used for payment"
              value={senderAccount}
              onChange={(e) => setSenderAccount(e.target.value)}
              className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:border-[#5362AD]/50 focus-visible:ring-[#5362AD]/20"
            />
          </div>
        </div>
      </div>

      <Button
        size="lg"
        className="w-full rounded-full bg-[#5362AD] font-semibold text-white shadow-[0_8px_20px_rgba(83,98,173,0.35)] hover:bg-[#4351a0] border-0 h-11"
        onClick={handleSubmit}
        disabled={submitting || !selectedMethodId || !amount || !senderAccount.trim() || !transactionRef.trim()}
      >
        {submitting ? "Submitting..." : "Submit Deposit Request"}
      </Button>

      <div className="overflow-hidden rounded-[20px] border border-border bg-card">
        <div className="border-b border-border bg-card px-5 py-4">
          <h3 className="text-base font-semibold tracking-tight text-foreground">Deposit History</h3>
          <p className="text-xs text-muted-foreground">
            {history.length} request{history.length === 1 ? "" : "s"} • approved deposits credit
            your wallet instantly
          </p>
        </div>
        {historyLoading ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">Loading history...</p>
        ) : history.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">
            No deposits yet. Your requests will appear here after you submit one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="thead-material">
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Amount</TableHead>
                  <TableHead className="text-muted-foreground">Method</TableHead>
                  <TableHead className="text-muted-foreground">Reference</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row) => (
                  <TableRow key={row.id} className="border-border hover:bg-muted">
                    <TableCell className="font-medium text-foreground">
                      {formatMoney(row.amount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(row.paymentMethod as string) || "—"}
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate font-mono text-xs text-muted-foreground">
                      {row.transactionReference}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                      {row.status === "rejected" && row.adminNote ? (
                        <p className="mt-1 max-w-[180px] text-[11px] text-red-300/80">
                          {row.adminNote}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      <ClientDate iso={row.createdAt} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
