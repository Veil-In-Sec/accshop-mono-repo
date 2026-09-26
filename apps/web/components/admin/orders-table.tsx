"use client"

import Link from "next/link"
import { Eye, Package } from "lucide-react"
import useSWR from "swr"

import { listAllOrders } from "@/app/actions/admin"
import { ClientDate } from "@/components/client-date"
import { StatusBadge } from "@/components/status-badge"
import { Pager } from "@/components/pager"
import { formatMoney } from "@/lib/format"
import { usePagination } from "@/lib/use-pagination"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type OrderRow = {
  id: number
  userEmail: string
  productName: string
  price: number
  quantity: number
  status: string
  supplier?: string
  externalOrderId?: string
  purchasedAt: string
  deliveredEmail: string
  deliveredPassword: string
  deliveredRefreshToken: string
  deliveredClientId: string
  deliveredCredentials: string
}

export function OrdersTable({ orders: initialOrders }: { orders: OrderRow[] }) {
  // Live list — refreshes every 10s so new balance-paid orders appear without a reload.
  const { data: orders = [] } = useSWR(
    "admin-orders",
    async () => (await listAllOrders()) as unknown as OrderRow[],
    {
      fallbackData: initialOrders,
      refreshInterval: 10000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    },
  )
  const { page, totalPages, total, paged, setPage } = usePagination(orders)

  const isCustomProduct = (order: OrderRow) => order.supplier === "custom"
  const needsDelivery = (order: OrderRow) => isCustomProduct(order) && order.status === "processing"

  return (
    <div className="rounded-xl border border-border bg-card">
      <Table className="thead-material">
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Purchased</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paged.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="font-medium text-foreground">{o.userEmail}</TableCell>
              <TableCell className="text-muted-foreground">{o.productName}</TableCell>
              <TableCell className="text-muted-foreground">{o.quantity}</TableCell>
              <TableCell>{formatMoney(o.price * o.quantity)}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {o.supplier ?? "hotmail143"}
              </TableCell>
              <TableCell>
                <StatusBadge status={o.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                <ClientDate iso={o.purchasedAt} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {o.status === "completed" ? (
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#5362AD]/15 px-3 py-1.5 text-xs font-medium text-[#8b9bff] dark:text-[#8b9bff] hover:bg-[#5362AD]/25"
                    >
                      <Eye className="size-3" />
                      View
                    </Link>
                  ) : needsDelivery(o) ? (
                    <Link
                      href={`/admin/orders/${o.id}/deliver`}
                      className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-400 hover:bg-amber-500/30 border border-amber-500/30"
                    >
                      <Package className="size-3.5 mr-1.5" />
                      Deliver
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {orders.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                No orders yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {total > 0 && (
        <div className="border-t border-border">
          <Pager page={page} totalPages={totalPages} total={total} unit="orders" onPage={setPage} />
        </div>
      )}
    </div>
  )
}