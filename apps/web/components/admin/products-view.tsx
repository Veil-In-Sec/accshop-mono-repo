"use client"

import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AdminProduct } from "@/lib/api/types"
import { CustomProductsTable } from "./custom-products-table"
import { HotmailProductsTable } from "./hotmail-products-table"
import { BulkMailProductsTable } from "./bulkmail-products-table"

type Product = AdminProduct

type HotmailProduct = { productType: string; accountType: string; name: string; stock: number }

type BulkMailProduct = {
  productId: number
  name: string
  sku: string
  stock: number
  price: number
}

function supplierOf(p: Product): "custom" | "hotmail" | "bulkmail" {
  const s = (p.supplier ?? "").toLowerCase()
  if (s === "bulkmail" || p.bulkmailProductId != null) return "bulkmail"
  if (p.externalProductType) return "hotmail"
  return "custom"
}

export function ProductsView({
  initialProducts,
  initialCategories,
  initialHotmailProducts,
  initialBulkmailProducts,
  usdToLocalRate,
  rateSource,
  currencySymbol,
}: {
  initialProducts: Product[]
  initialCategories: Array<{ id: number; name: string }>
  initialHotmailProducts: HotmailProduct[]
  initialBulkmailProducts: BulkMailProduct[]
  usdToLocalRate: number
  rateSource: string
  currencySymbol: string
}) {
  const [view, setView] = React.useState<"custom" | "hotmail" | "bulkmail">("custom")

  const customProducts = initialProducts.filter((p) => supplierOf(p) === "custom")
  const hotmailProducts = initialProducts.filter((p) => supplierOf(p) === "hotmail")
  const bulkmailProducts = initialProducts.filter((p) => supplierOf(p) === "bulkmail")

  const tabs = [
    { id: "custom" as const, label: "Custom Products", count: customProducts.length },
    { id: "hotmail" as const, label: "Hotmail143 Products", count: hotmailProducts.length },
    { id: "bulkmail" as const, label: "BulkMail Products", count: bulkmailProducts.length },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setView(t.id)}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              view === t.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t.label}
            <Badge variant="secondary" className="ml-1 text-xs">
              {t.count}
            </Badge>
          </button>
        ))}
      </div>

      {view === "custom" ? (
        <CustomProductsTable
          initialProducts={customProducts}
          initialCategories={initialCategories}
        />
      ) : view === "hotmail" ? (
        <HotmailProductsTable
          initialProducts={hotmailProducts}
          initialCategories={initialCategories}
          initialHotmailProducts={initialHotmailProducts}
        />
      ) : (
        <BulkMailProductsTable
          initialProducts={bulkmailProducts}
          initialCategories={initialCategories}
          initialBulkmailProducts={initialBulkmailProducts}
          usdToLocalRate={usdToLocalRate}
          rateSource={rateSource}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  )
}
