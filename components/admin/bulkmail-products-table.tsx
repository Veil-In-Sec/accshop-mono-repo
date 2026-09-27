"use client"

import { Pencil, ChevronDown, Search, Trash2, X } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import type { AdminProduct } from "@/lib/api/types"

import {
  deleteProduct,
  getBulkmailCatalog,
  getBulkmailCatalogProduct,
  upsertProduct,
} from "@/app/actions/admin"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { BulkMailCatalogDetails, BulkMailCatalogPage } from "@/lib/api/endpoints"

type Product = AdminProduct

type BulkMailProduct = {
  productId: number
  name: string
  sku: string
  stock: number
  price: number
}

type CatalogItem = BulkMailCatalogPage["items"][number]

const emptyForm = {
  id: undefined as number | undefined,
  slug: "",
  name: "",
  category: "",
  section: "catalog",
  price: "",
  originalPrice: "",
  stock: "0",
  tag: "",
  badge: "",
  active: true,
  featured: false,
  bulkmailProductId: null as number | null,
}

/** Live BulkMail catalog browser (Products API) — search, filter, paginate, select to map. */
function CatalogBrowser({
  currencySymbol,
  onSelect,
}: {
  currencySymbol: string
  onSelect: (item: CatalogItem) => void
}) {
  const [open, setOpen] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [inStock, setInStock] = React.useState(true)
  const [sort, setSort] = React.useState("name")
  const [order, setOrder] = React.useState("asc")
  const [page, setPage] = React.useState(1)
  const [data, setData] = React.useState<BulkMailCatalogPage | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [expandedId, setExpandedId] = React.useState<number | null>(null)
  const [detailsMap, setDetailsMap] = React.useState<Map<number, BulkMailCatalogDetails>>(new Map())
  const [detailsLoading, setDetailsLoading] = React.useState<number | null>(null)

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  const load = React.useCallback(async () => {
    setLoading(true)
    const res = await getBulkmailCatalog({
      page,
      perPage: 10,
      search: debouncedSearch || undefined,
      inStock,
      sort,
      order,
    })
    setLoading(false)
    if (res.ok) setData(res)
    else toast.error(res.message)
  }, [page, debouncedSearch, inStock, sort, order])

  React.useEffect(() => {
    if (open) void load()
  }, [open, load])

  async function toggleExpand(id: number) {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (detailsMap.has(id)) return
    setDetailsLoading(id)
    const res = await getBulkmailCatalogProduct(id)
    setDetailsLoading(null)
    if (res.ok) setDetailsMap((prev) => new Map(prev).set(id, res))
    else toast.error(res.message)
  }

  const totalPages = data?.meta.total_pages ?? 1
  const total = data?.meta.total ?? 0

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <h3 className="text-base font-semibold text-foreground">BulkMail Catalog — all products</h3>
          <p className="text-xs text-muted-foreground">
            Live supplier catalog with BDT costs. Select an item to map it below with your own price &amp; category.
          </p>
        </div>
        <span className="text-xs font-medium text-muted-foreground">{open ? "Hide ▴" : "Browse ▾"}</span>
      </button>
      {open && (
        <div className="border-t border-border px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search supplier catalog…"
                className="pl-9"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={inStock} onCheckedChange={(v) => { setInStock(v); setPage(1) }} />
              In stock only
            </label>
            <Select value={sort} onValueChange={(v: string | null) => v && setSort(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="stock_quantity">Stock</SelectItem>
                <SelectItem value="created_at">Newest</SelectItem>
              </SelectContent>
            </Select>
            <Select value={order} onValueChange={(v: string | null) => v && setOrder(v)}>
              <SelectTrigger className="w-[110px]">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Asc</SelectItem>
                <SelectItem value="desc">Desc</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading catalog…</p>
          ) : !data || data.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No products found.</p>
          ) : (
            <>
              <Table className="thead-material">
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Supplier cost</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((item) => {
                    const details = detailsMap.get(item.productId)
                    const isOpen = expandedId === item.productId
                    return (
                      <React.Fragment key={item.productId}>
                        <TableRow>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => void toggleExpand(item.productId)}
                                aria-label={isOpen ? "Hide details" : "Show details"}
                                aria-expanded={isOpen}
                                className="pressable flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-white/10 hover:text-white"
                              >
                                <ChevronDown className={`size-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                              </button>
                              <span className="font-medium text-foreground">{item.name}</span>
                              {item.bulkPricingEnabled && (
                                <Badge variant="secondary" className="text-[10px]">Bulk tiers</Badge>
                              )}
                              {!item.inStock && (
                                <Badge variant="outline" className="text-[10px]">Out of stock</Badge>
                              )}
                            </div>
                            <p className="font-mono text-[11px] text-muted-foreground">
                              #{item.productId} · {item.sku || "no sku"}
                            </p>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            ${item.price.toFixed(4)}{" "}
                            <span className="text-muted-foreground">
                              ≈ {currencySymbol} {item.priceBdt.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>{item.stock.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => onSelect(item)}>
                              Select
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isOpen && (
                          <TableRow className="bg-white/[0.02] hover:bg-white/[0.02]">
                            <TableCell colSpan={4} className="py-3">
                              {detailsLoading === item.productId && !details ? (
                                <p className="text-xs text-muted-foreground">Loading details…</p>
                              ) : details ? (
                                <div className="flex flex-col gap-2">
                                  {details.product.description ? (
                                    <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
                                      {details.product.description}
                                    </p>
                                  ) : (
                                    <p className="text-xs text-muted-foreground">No supplier description.</p>
                                  )}
                                  {details.tiers.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {details.tiers.map((t) => (
                                        <span key={t.min_quantity} className="rounded-md bg-white/[0.04] px-2 py-1 font-mono text-[11px] text-foreground ring-1 ring-white/10">
                                          {t.min_quantity}+ → ${t.price.toFixed(4)}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-muted-foreground">No bulk tiers — flat unit price.</p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-red-400">Could not load details.</p>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })}
                </TableBody>
              </Table>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Page {data.meta.current_page} of {totalPages} · {total.toLocaleString()} products
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function BulkMailProductsTable({
  initialProducts,
  initialCategories,
  initialBulkmailProducts,
  usdToLocalRate,
  rateSource,
  currencySymbol,
}: {
  initialProducts: Product[]
  initialCategories: Array<{ id: number; name: string }>
  initialBulkmailProducts: BulkMailProduct[]
  usdToLocalRate: number
  rateSource: string
  currencySymbol: string
}) {
  const [products, setProducts] = React.useState(initialProducts)
  const [form, setForm] = React.useState(emptyForm)
  const [isSaving, setIsSaving] = React.useState(false)

  const categoryOptions = React.useMemo(() => {
    const names = initialCategories.map((c) => c.name)
    if (form.category && !names.includes(form.category)) {
      return [{ id: -1, name: form.category }, ...initialCategories]
    }
    return initialCategories
  }, [initialCategories, form.category])

  const matched = React.useMemo(() => {
    if (form.bulkmailProductId == null) return null
    return (
      initialBulkmailProducts.find((p) => p.productId === form.bulkmailProductId) ?? null
    )
  }, [initialBulkmailProducts, form.bulkmailProductId])

  const matchedStock = matched?.stock ?? null

  function openEdit(product: Product) {    setForm({
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      section: product.section,
      price: String(product.price),
      originalPrice: product.originalPrice ? String(product.originalPrice) : "",
      stock: String(product.stock),
      tag: product.tag,
      badge: product.badge,
      active: product.active,
      featured: product.featured,
      bulkmailProductId: product.bulkmailProductId ?? null,
    })
  }

  /** Fill the mapping form from a catalog browser selection (price stays manual). */
  function selectCatalogItem(item: CatalogItem) {
    setForm((prev) => ({
      ...prev,
      bulkmailProductId: item.productId,
      name: prev.name.trim() ? prev.name : item.name,
    }))
    toast.success(`Mapped to #${item.productId} — set your BDT price & category, then save.`)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.category.trim() || !form.price) {
      toast.error("Name, category, and price are required.")
      return
    }
    if (form.bulkmailProductId == null) {
      toast.error("Select a BulkMail product.")
      return
    }
    const slug =
      form.slug.trim() ||
      `${form.section}-${Date.now()}-${form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}`

    setIsSaving(true)
    let result: Awaited<ReturnType<typeof upsertProduct>>
    try {
      result = await upsertProduct({
        id: form.id,
        slug,
        name: form.name.trim(),
        category: form.category.trim(),
        section: form.section,
        price: Number.parseFloat(form.price),
        originalPrice: form.originalPrice ? Number.parseFloat(form.originalPrice) : null,
        stock: matchedStock ?? 0,
        tag: form.tag.trim(),
        badge: form.badge.trim(),
        active: form.active,
        featured: form.featured,
        externalProductType: "",
        externalAccountType: "",
        supplier: "bulkmail",
        bulkmailProductId: form.bulkmailProductId,
      })
    } catch (e) {
      setIsSaving(false)
      toast.error(e instanceof Error ? e.message : "Could not save product.")
      return
    }
    setIsSaving(false)

    if (result.success) {
      toast.success(form.id ? "Product updated." : "Product created.")
      setForm(emptyForm)
      setProducts((prev) => {
        const updated: Product = {
          id: form.id ?? Math.max(0, ...prev.map((p) => p.id)) + 1,
          slug,
          name: form.name.trim(),
          category: form.category.trim(),
          section: form.section,
          price: Number.parseFloat(form.price),
          originalPrice: form.originalPrice ? Number.parseFloat(form.originalPrice) : null,
          stock: matchedStock ?? 0,
          tag: form.tag.trim(),
          badge: form.badge.trim(),
          active: form.active,
          featured: form.featured,
          externalProductType: "",
          externalAccountType: "",
          supplier: "bulkmail",
          bulkmailProductId: form.bulkmailProductId,
        }
        if (form.id) return prev.map((p) => (p.id === form.id ? updated : p))
        return [...prev, updated]
      })
    } else {
      toast.error((result as { message?: string }).message ?? "Could not save product.")
    }
  }

  async function handleDelete(id: number) {
    let delResult: Awaited<ReturnType<typeof deleteProduct>>
    try {
      delResult = await deleteProduct(id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete product.")
      return
    }
    if (delResult.success) {
      setProducts((prev) => prev.filter((p) => p.id !== id))
      toast.success("Product deleted.")
    } else {
      toast.error((delResult as { message?: string }).message ?? "Could not delete product.")
    }
  }

  async function toggleActive(product: Product) {
    const result = await upsertProduct({
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category,
      section: product.section,
      price: product.price,
      originalPrice: product.originalPrice,
      stock: product.stock,
      tag: product.tag,
      badge: product.badge,
      active: !product.active,
      featured: product.featured,
      externalProductType: product.externalProductType,
      externalAccountType: product.externalAccountType,
      supplier: "bulkmail",
      bulkmailProductId: product.bulkmailProductId ?? null,
    })
    if (result.success) {
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, active: !p.active } : p)))
      toast.success(product.active ? "Product deactivated." : "Product activated.")
    }
  }

  const isEditing = form.id !== undefined

  return (
    <div className="flex flex-col gap-6">
      <CatalogBrowser currencySymbol={currencySymbol} onSelect={selectCatalogItem} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Products List */}
      <div className="rounded-xl border border-border bg-card lg:col-span-3">
        <div className="border-b border-border px-5 py-4">
          <p className="text-sm text-muted-foreground">{products.length} BulkMail products</p>
        </div>
        <Table className="thead-material">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>BulkMail ID</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow
                key={product.id}
                className={form.id === product.id ? "bg-primary/5" : ""}
              >
                <TableCell className="font-medium text-foreground">{product.name}</TableCell>
                <TableCell className="text-muted-foreground">{product.category}</TableCell>
                <TableCell className="font-mono text-muted-foreground">
                  #{product.bulkmailProductId ?? "—"}
                </TableCell>
                <TableCell>{currencySymbol} {product.price.toFixed(2)}</TableCell>
                <TableCell>{product.stock}</TableCell>
                <TableCell>
                  <Badge variant={product.active ? "default" : "secondary"}>
                    {product.active ? "Active" : "Hidden"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => toggleActive(product)}>
                      <Badge variant={product.active ? "default" : "outline"} className="cursor-pointer text-xs">
                        {product.active ? "On" : "Off"}
                      </Badge>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Form */}
      <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            {isEditing ? "Edit Product" : "Add Product"}
          </h3>
          {isEditing && (
            <Button variant="ghost" size="icon" onClick={() => setForm(emptyForm)}>
              <X className="size-4" />
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel htmlFor="category">Category</FieldLabel>
            <Select
              value={form.category}
              onValueChange={(value: string | null) => value && setForm({ ...form, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="price">Price</FieldLabel>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="stock">Stock</FieldLabel>
              <Input
                id="stock"
                type="number"
                value={matchedStock !== null ? String(matchedStock) : form.stock}
                disabled={matchedStock !== null}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel>Mapped BulkMail product</FieldLabel>
            {form.bulkmailProductId != null ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[#5362AD]/40 bg-[#5362AD]/10 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    #{form.bulkmailProductId} {matched?.name ?? ""}
                  </p>
                  <p className="font-mono text-[11px] text-zinc-400">
                    {matched ? `${matched.sku || "no sku"} · ${matched.stock.toLocaleString()} in stock` : "from catalog browser"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, bulkmailProductId: null })}
                  aria-label="Clear mapped product"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-white/10 px-3 py-2.5 text-xs text-zinc-500">
                No product mapped — pick one from the catalog browser above.
              </p>
            )}
          </Field>
          {matched && (
            <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
              Available stock: <span className="font-semibold text-foreground">{matched.stock}</span>
              {matched.sku ? (
                <>
                  {" "}· SKU: <span className="font-mono">{matched.sku}</span>
                </>
              ) : null}
              {matched.price ? (
                <>
                  {" "}· Supplier cost: <span className="font-semibold">${matched.price.toFixed(2)} ≈ {currencySymbol} {(matched.price * usdToLocalRate).toFixed(2)}</span>
                  <span className="text-[11px] opacity-70"> ({rateSource === "live" ? "live rate" : rateSource === "flat" ? "flat rate" : "manual rate"})</span>
                </>
              ) : null}
            </div>
          )}
          <Field>
            <FieldLabel htmlFor="badge">Badge</FieldLabel>
            <Input id="badge" value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field className="flex-row items-center justify-between">
              <FieldLabel htmlFor="active">Active</FieldLabel>
              <Switch
                id="active"
                checked={form.active}
                onCheckedChange={(checked) => setForm({ ...form, active: checked })}
              />
            </Field>
            <Field className="flex-row items-center justify-between">
              <FieldLabel htmlFor="featured">Featured</FieldLabel>
              <Switch
                id="featured"
                checked={form.featured}
                onCheckedChange={(checked) => setForm({ ...form, featured: checked })}
              />
            </Field>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? "Saving..." : isEditing ? "Update Product" : "Add Product"}
          </Button>
        </div>
      </div>
      </div>
    </div>
  )
}
