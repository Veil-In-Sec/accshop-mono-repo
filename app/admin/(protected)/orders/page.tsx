import { listAllOrders } from "@/app/actions/admin"
import { OrdersTable } from "@/components/admin/orders-table"
import { PageHeader } from "@/components/admin/page-header"

export const dynamic = "force-dynamic"

export default async function AdminOrdersPage() {
  const orders = await listAllOrders()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Orders"
        description="Every purchase made across all customer accounts. Orders are paid from wallet balance and delivered automatically — failed supplier fulfillments are refunded to the customer."
      />
      <OrdersTable orders={orders} />
    </div>
  )
}

