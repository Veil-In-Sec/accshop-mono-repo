"use client"

import * as React from "react"
import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Wallet } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { purchaseOrder } from "@/app/actions/purchase"
import { formatMoney } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/use-auth"

const MAX_QTY = 100

function PayContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { balance, refresh, isLoading: authLoading } = useAuth()

  const productIdRaw = searchParams.get("productId")
  const productId = productIdRaw && /^\d+$/.test(productIdRaw) ? productIdRaw : null
  // Display-only: the server charges the canonical DB price, never this query param.
  const productName = (searchParams.get("name") || "Product").slice(0, 200)
  const rawPrice = Number(searchParams.get("price"))
  const price = Number.isFinite(rawPrice) && rawPrice >= 0 ? Math.min(rawPrice, 1_000_000) : 0

  const [quantity, setQuantity] = React.useState(1)
  const [submitting, setSubmitting] = React.useState(false)

  const total = Number((price * quantity).toFixed(2))
  const sufficient = balance >= total && total > 0
  const shortfall = Number(Math.max(0, total - balance).toFixed(2))
  const remaining = Number(Math.max(0, balance - total).toFixed(2))

  async function handleSubmit() {
    if (!productId) {
      toast.error("Invalid product.")
      return
    }
    if (!sufficient) {
      toast.error(
        `Insufficient balance. You need ${formatMoney(shortfall)} more — please deposit first.`,
      )
      return
    }
    setSubmitting(true)
    try {
      const result = await purchaseOrder({
        productId: Number(productId),
        quantity,
      })
      if (result.success) {
        toast.success(
          result.message || "Payment successful — your credentials were delivered instantly.",
        )
        await refresh()
        setTimeout(() => {
          if (result.delivered && result.order?.id) {
            router.push(`/dashboard/orders/${result.order.id}`)
          } else {
            router.push("/dashboard/orders")
          }
        }, 1200)
      } else {
        toast.error("Failed to place order.")
        setSubmitting(false)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to place order."
      toast.error(message)
      await refresh()
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link
        href="/dashboard"
        className="pressable inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit rounded-lg"
      >
        <ArrowLeft className="size-4" />
        Back to products
      </Link>

      <div>
        <h1 className="type-title text-xl text-foreground">Checkout</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pay instantly from your deposit balance. No manual payment needed.
        </p>
      </div>

      <div className="rounded-[20px] border border-border bg-card p-5">
        <h2 className="text-sm font-medium text-muted-foreground">Order Summary</h2>
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <p className="text-base font-semibold tracking-tight text-foreground">{productName}</p>
          <p className="text-lg font-bold tracking-tight text-foreground">
            {formatMoney(total)}
          </p>
        </div>
        {quantity > 1 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {formatMoney(price)} × {quantity} = {formatMoney(total)}
          </p>
        )}
      </div>

      <div className="rounded-[20px] border border-border bg-card p-5">
        <h2 className="text-sm font-medium text-muted-foreground">Quantity</h2>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="pressable size-9 flex items-center justify-center rounded-xl border border-border bg-muted text-lg font-medium text-foreground hover:bg-muted disabled:opacity-40"
            disabled={quantity <= 1 || submitting}
          >
            -
          </button>
          <input
            type="number"
            min={1}
            max={MAX_QTY}
            value={quantity}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10)
              if (Number.isFinite(v) && v >= 1) setQuantity(Math.min(MAX_QTY, v))
            }}
            disabled={submitting}
            className="h-9 w-16 rounded-xl border border-border bg-muted px-2 text-center text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-[#5362AD]/30"
          />
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(MAX_QTY, q + 1))}
            disabled={submitting}
            className="pressable size-9 flex items-center justify-center rounded-xl border border-border bg-muted text-lg font-medium text-foreground hover:bg-muted"
          >
            +
          </button>
        </div>
      </div>

      <div className="rounded-[20px] border border-border bg-card p-5">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Wallet className="size-4" />
          Wallet Balance
        </h2>
        {authLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading balance...</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Available</span>
              <span className="font-semibold tabular-nums text-foreground">
                {formatMoney(balance)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Order total</span>
              <span className="font-semibold tabular-nums text-foreground">
                − {formatMoney(total)}
              </span>
            </div>
            <div className="my-1 h-px bg-muted" />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Remaining after purchase</span>
              <span
                className={
                  sufficient
                    ? "font-semibold tabular-nums text-primary"
                    : "font-semibold tabular-nums text-red-300"
                }
              >
                {formatMoney(remaining)}
              </span>
            </div>
          </div>
        )}

        {!authLoading && !sufficient && (
          <div className="mt-4 rounded-xl bg-red-500/10 px-3 py-2.5 text-xs leading-relaxed text-red-200 ring-1 ring-red-500/20">
            Insufficient balance — you need {formatMoney(shortfall)} more to buy this.
            <Link
              href="/dashboard/deposit"
              className="mt-2 flex w-full items-center justify-center rounded-full bg-[#5362AD] py-2.5 text-xs font-bold text-white hover:bg-[#4351a0]"
            >
              Deposit {formatMoney(shortfall)} now
            </Link>
          </div>
        )}

        {!authLoading && sufficient && (
          <p className="mt-3 rounded-xl bg-[#5362AD]/10 px-3 py-2 text-xs text-primary ring-1 ring-[#5362AD]/20">
            Sufficient balance. The total is deducted from your wallet and your credentials
            are delivered instantly — no manual steps needed.
          </p>
        )}
      </div>

      <Button
        size="lg"
        className="w-full rounded-full bg-[#5362AD] font-semibold text-white shadow-[0_8px_20px_rgba(83,98,173,0.35)] hover:bg-[#4351a0] border-0 h-11 disabled:opacity-50"
        onClick={handleSubmit}
        disabled={submitting || !productId || !sufficient || total <= 0}
      >
        {submitting
          ? "Placing order..."
          : sufficient
            ? `Pay ${formatMoney(total)} from balance`
            : "Insufficient balance"}
      </Button>

      {!sufficient && !authLoading && (
        <p className="text-center text-xs text-muted-foreground">
          After deposit approval your balance updates automatically — then return here to complete
          the purchase.
        </p>
      )}
    </div>
  )
}

export default function PayPage() {
  return (
    <Suspense fallback={<p className="py-16 text-center text-sm text-muted-foreground">Loading checkout…</p>}>
      <PayContent />
    </Suspense>
  )
}
