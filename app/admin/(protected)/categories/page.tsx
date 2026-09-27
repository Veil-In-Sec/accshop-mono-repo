import { listCategories } from "@/app/actions/admin"
import { CategoriesManager } from "@/components/admin/categories-manager"
import { PageHeader } from "@/components/admin/page-header"

export default async function AdminCategoriesPage() {
  const categories = await listCategories()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Categories"
        description="Manage the categories shown across the customer panel. You can rename, activate/deactivate, or delete any category here."
      />
      <CategoriesManager initialCategories={categories} />
    </div>
  )
}
