import { listPaymentMethods } from "@/app/actions/admin"
import { PaymentMethodsTable } from "@/components/admin/payment-methods-table"
import { PageHeader } from "@/components/admin/page-header"

export default async function AdminPaymentMethodsPage() {
  const methods = await listPaymentMethods()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Payment Methods"
        description="Control which deposit options customers see and how they're instructed to pay."
      />
      <PaymentMethodsTable initialMethods={methods} />
    </div>
  )
}
