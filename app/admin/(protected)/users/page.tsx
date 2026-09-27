import { listUsers } from "@/app/actions/admin"
import { UsersTable } from "@/components/admin/users-table"
import { PageHeader } from "@/components/admin/page-header"

export default async function AdminUsersPage() {
  const users = await listUsers()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        description="All registered customer accounts."
      />
      <UsersTable initialUsers={users} />
    </div>
  )
}
