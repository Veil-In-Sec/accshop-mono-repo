import { getAdminSettings, getBulkmailProducts, getFxRate, getHotmailProducts, listCategories, listProducts } from "@/app/actions/admin"
import { ProductsView } from "@/components/admin/products-view"
import { PageHeader } from "@/components/admin/page-header"

export default async function AdminProductsPage() {
  const [products, categories, hotmailProducts, bulkmailProducts, settings, fx] = await Promise.all([
    listProducts(),
    listCategories(),
    getHotmailProducts(),
    getBulkmailProducts(),
    getAdminSettings(),
    getFxRate(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Products"
        description="Manage custom products, Hotmail143 sourced products, and BulkMail sourced products."
      />
      <ProductsView
        initialProducts={products}
        initialCategories={categories}
        initialHotmailProducts={hotmailProducts.ok ? hotmailProducts.products : []}
        initialBulkmailProducts={bulkmailProducts.ok ? bulkmailProducts.products : []}
        usdToLocalRate={fx.rate}
        rateSource={fx.source}
        currencySymbol={settings?.currencySymbol ?? fx.currency}
      />
    </div>
  )
}
