"use client"

import { ShoppingCart, ArrowRight, RefreshCw } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ClientDate } from "@/components/client-date"
import { StatusBadge } from "@/components/status-badge"
import { Pager } from "@/components/pager"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatLineTotal } from "@/lib/format"
import { usePagination } from "@/lib/use-pagination"
import { useAuth } from "@/lib/use-auth"

export default function OrderHistoryPage() {
  const { orders, refresh } = useAuth()
  const { page, totalPages, total, paged, setPage } = usePagination(orders)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="type-title text-xl text-foreground">Order History</h2>
        <button
          type="button"
          onClick={() => refresh()}
          className="pressable inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <RefreshCw className="size-3" />
          Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-border bg-card">
        <div className="border-b border-border bg-card px-5 py-4">
          <h3 className="text-base font-semibold tracking-tight text-foreground">Your Orders</h3>
          <p className="text-xs text-muted-foreground">Track and manage your purchased accounts</p>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-muted ring-1 ring-border">
              <ShoppingCart className="size-6 text-muted-foreground" />
            </span>
            <p className="text-sm text-muted-foreground">
              You haven&apos;t made any orders yet.
            </p>
            <Button
              render={<Link href="/dashboard" />}
              nativeButton={false}
              className="rounded-full bg-zinc-900 font-semibold text-white hover:bg-zinc-700 border-0 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              Shop Now
            </Button>
          </div>
        ) : (
          <Table className="thead-material">
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Product</TableHead>
                <TableHead className="text-muted-foreground">Price</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-right text-muted-foreground">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((order) => (
                <TableRow key={order.id} className="border-border hover:bg-muted">
                  <TableCell className="max-w-[200px] sm:max-w-[260px]">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="block min-w-0 flex-1 truncate font-medium text-foreground" title={order.productName}>
                        {order.productName}
                      </span>
                      {order.tag && (
                        <Badge className="bg-[#5362AD]/15 text-primary ring-1 ring-[#5362AD]/20 border-0 text-[10px]">
                          {order.tag}
                        </Badge>
                      )}
                      {(order.quantity ?? 1) > 1 && (
                        <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                          ×{order.quantity}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {formatLineTotal(order.price, order.quantity)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <ClientDate iso={order.purchasedAt} />
                  </TableCell>
                  <TableCell className="text-right">
                    {order.status === "completed" ? (
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                      >
                        <ArrowRight className="size-3.5" />
                        View
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {total > 0 && (
          <div className="border-t border-border">
            <Pager page={page} totalPages={totalPages} total={total} unit="orders" onPage={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}
