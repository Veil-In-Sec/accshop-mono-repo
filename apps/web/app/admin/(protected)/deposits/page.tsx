import { listAllDeposits } from "@/app/actions/deposits"
import { DepositsTable } from "@/components/admin/deposits-table"
import { PageHeader } from "@/components/admin/page-header"

export const dynamic = "force-dynamic"

export default async function AdminDepositsPage() {
  const deposits = await listAllDeposits()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Deposits"
        description="Review customer deposit requests. Approving credits the customer's wallet instantly and records a deposit transaction."
      />
      <DepositsTable initialDeposits={deposits} />
    </div>
  )
}
