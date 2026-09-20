import Link from "next/link"
import { notFound } from "next/navigation"

import { getUserDetails } from "@/app/actions/admin"
import { PageHeader } from "@/components/admin/page-header"
import { UserDashboard } from "@/components/admin/user-dashboard"

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const userId = decodeURIComponent(id)

  let details
  try {
    details = await getUserDetails(userId)
  } catch {
    notFound()
  }
  if (!details || !details.user) notFound()

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/users"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to users
      </Link>
      <PageHeader
        title={details.user.name || details.user.email}
        description={`${details.user.email} • individual account dashboard — orders, wallet, deposits, support and sessions.`}
      />
      <UserDashboard details={details} />
    </div>
  )
}
