import { listSupportConversations } from "@/app/actions/admin"
import { SupportInbox } from "@/components/admin/support-inbox"
import { PageHeader } from "@/components/admin/page-header"

export const dynamic = "force-dynamic"

export default async function AdminSupportPage() {
  const conversations = await listSupportConversations()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Support chat"
        description="Live conversations with customers — replies land instantly in their dashboard chat."
      />
      <SupportInbox initial={conversations} />
    </div>
  )
}
