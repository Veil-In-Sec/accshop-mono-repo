"use client"

import { Pencil, Search, Trash2, X } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import type { AdminProduct } from "@/lib/api/types"

import { deleteProduct, upsertProduct } from "@/app/actions/admin"
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

type Product = AdminProduct

type HotmailProduct = { productType: string; accountType: string; name: string; stock: number }

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
  externalProductType: null as string | null,
  externalAccountType: null as string | null,
}

export function HotmailProductsTable({
  initialProducts,
  initialCategories,
  initialHotmailProducts,
}: {
  initialProducts: Product[]
  initialCategories: Array<{ id: number; name: string }>
  initialHotmailProducts: HotmailProduct[]
}) {
  const [products, setProducts] = React.useState(initialProducts)
  const [form, setForm] = React.useState(emptyForm)
  const [isSaving, setIsSaving] = React.useState(false)

  // Catalog browser (same UX as BulkMail) — search/filter all supplier combos, select to map.
  const [browserOpen, setBrowserOpen] = React.useState(true)
  const [browserSearch, setBrowserSearch] = React.useState("")
  const [browserInStockOnly, setBrowserInStockOnly] = React.useState(true)
  const [browserSort, setBrowserSort] = React.useState("name")
  const [browserOrder, setBrowserOrder] = React.useState("asc")
  const [browserPage, setBrowserPage] = React.useState(1)
  const BROWSER_PER_PAGE = 10

  const browserItems = React.useMemo(() => {
    const q = browserSearch.trim().toLowerCase()
    const filtered = initialHotmailProducts.filter((p) => {
      if (browserInStockOnly && p.stock <= 0) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.productType.toLowerCase().includes(q) ||
        p.accountType.toLowerCase().includes(q)
      )
    })
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (browserSort === "stock") cmp = a.stock - b.stock
      else if (browserSort === "productType") {
        cmp =
          a.productType.localeCompare(b.productType) ||
          a.accountType.localeCompare(b.accountType)
      } else {
        cmp = a.name.localeCompare(b.name)
      }
      return browserOrder === "desc" ? -cmp : cmp
    })
  }, [initialHotmailProducts, browserSearch, browserInStockOnly, browserSort, browserOrder])

  const browserTotalPages = Math.max(1, Math.ceil(browserItems.length / BROWSER_PER_PAGE))
  const browserSafePage = Math.min(browserPage, browserTotalPages)
  const browserPaged = browserItems.slice(
    (browserSafePage - 1) * BROWSER_PER_PAGE,
    browserSafePage * BROWSER_PER_PAGE,
  )

  function selectCatalogItem(item: HotmailProduct) {
    setForm((prev) => ({
      ...prev,
      externalProductType: item.productType,
      externalAccountType: item.accountType,
    }))
    toast.success(`Mapped to ${item.productType} / ${item.accountType} — set your price & category, then save.`)
  }

  const categoryOptions = React.useMemo(() => {
    const names = initialCategories.map((c) => c.name)
    if (form.category && !names.includes(form.category)) {
      return [{ id: -1, name: form.category }, ...initialCategories]
    }
    return initialCategories
  }, [initialCategories, form.category])

  const productTypeOptions = React.useMemo(() => {
    const seen = new Map<string, number>()
    for (const p of initialHotmailProducts) {
      const total = seen.get(p.productType) ?? 0
      seen.set(p.productType, total + p.stock)
    }
    return Array.from(seen.entries()).map(([value, stock]) => ({ value, stock }))
  }, [initialHotmailProducts])

  const accountTypeOptions = React.useMemo(() => {
    if (!form.externalProductType) return []
    return initialHotmailProducts
      .filter((p) => p.productType === form.externalProductType)
      .map((p) => ({ value: p.accountType, stock: p.stock }))
  }, [initialHotmailProducts, form.externalProductType])

  const matchedStock = React.useMemo(() => {
    if (!form.externalProductType || !form.externalAccountType) return null
    const match = initialHotmailProducts.find(
      (p) => p.productType === form.externalProductType && p.accountType === form.externalAccountType,
    )
    return match?.stock ?? null
  }, [initialHotmailProducts, form.externalProductType, form.externalAccountType])

  function openCreate() {
    setForm(emptyForm)
  }

  function openEdit(product: Product) {
    setForm({
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
      externalProductType: product.externalProductType || null,
      externalAccountType: product.externalAccountType || null,
    })
  }

  function handleProductTypeChange(value: string | null) {
    setForm((prev) => ({
      ...prev,
      externalProductType: value,
      externalAccountType: null,
    }))
  }

  function handleAccountTypeChange(value: string | null) {
    setForm((prev) => ({
      ...prev,
      externalAccountType: value,
    }))
  }

  async function handleSave() {
    if (!form.name.trim() || !form.category.trim() || !form.price) {
      toast.error("Name, category, and price are required.")
      return
    }
    const slug =
      form.slug.trim() ||
      `${form.section}-${Date.now()}-${form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}`

    setIsSaving(true)
    const result = await upsertProduct({
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
      externalProductType: form.externalProductType ?? "",
      externalAccountType: form.externalAccountType ?? "",
      supplier: "hotmail143",
      bulkmailProductId: null,
    })
    setIsSaving(false)

    if (result.success) {
      toast.success(form.id ? "Product updated." : "Product created.")
      setForm(emptyForm)
      setProducts((prev) => {
        const updated = {
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
          externalProductType: form.externalProductType ?? "",
          externalAccountType: form.externalAccountType ?? "",
          supplier: "hotmail143",
          bulkmailProductId: null,
        }
        if (form.id) return prev.map((p) => (p.id === form.id ? updated : p))
        return [...prev, updated]
      })
    } else {
      toast.error("Could not save product.")
    }
  }

  async function handleDelete(id: number) {
    const result = await deleteProduct(id)
    if (result.success) {
      setProducts((prev) => prev.filter((p) => p.id !== id))
      toast.success("Product deleted.")
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
      supplier: "hotmail143",
      bulkmailProductId: null,
    })
    if (result.success) {
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, active: !p.active } : p)))
      toast.success(product.active ? "Product deactivated." : "Product activated.")
    }
  }

  const isEditing = form.id !== undefined

  return (
    <div className="flex flex-col gap-6">
      {/* Supplier catalog browser */}
      <div className="rounded-xl border border-border bg-card">
        <button
          type="button"
          onClick={() => setBrowserOpen((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <div>
            <h3 className="text-base font-semibold text-foreground">Hotmail143 Catalog — all products</h3>
            <p className="text-xs text-muted-foreground">
              Live supplier stock ({initialHotmailProducts.length} combinations). Select one to map it below with your own price &amp; category.
            </p>
          </div>
          <span className="text-xs font-medium text-muted-foreground">{browserOpen ? "Hide ▴" : "Browse ▾"}</span>
        </button>
        {browserOpen && (
          <div className="border-t border-border px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={browserSearch}
                  onChange={(e) => { setBrowserSearch(e.target.value); setBrowserPage(1) }}
                  placeholder="Search supplier catalog…"
                  className="pl-9"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={browserInStockOnly} onCheckedChange={(v) => { setBrowserInStockOnly(v); setBrowserPage(1) }} />
                In stock only
              </label>
              <Select value={browserSort} onValueChange={(v: string | null) => v && (setBrowserSort(v), setBrowserPage(1))}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="productType">Product type</SelectItem>
                  <SelectItem value="stock">Stock</SelectItem>
                </SelectContent>
              </Select>
              <Select value={browserOrder} onValueChange={(v: string | null) => v && (setBrowserOrder(v), setBrowserPage(1))}>
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Asc</SelectItem>
                  <SelectItem value="desc">Desc</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {browserItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No products found.</p>
            ) : (
              <>
                <Table className="thead-material">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Account type</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {browserPaged.map((item) => (
                      <TableRow key={`${item.productType}:${item.accountType}`}>
                        <TableCell>
                          <span className="font-medium text-foreground">{item.name}</span>
                          <p className="font-mono text-[11px] text-muted-foreground">{item.productType}</p>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {item.accountType}
                        </TableCell>
                        <TableCell>
                          {item.stock.toLocaleString()}
                          {item.stock <= 0 && (
                            <Badge variant="outline" className="ml-2 text-[10px]">Out of stock</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => selectCatalogItem(item)}>
                            Select
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Page {browserSafePage} of {browserTotalPages} · {browserItems.length} of {initialHotmailProducts.length} combinations
                  </span>
                  <span className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={browserSafePage <= 1}
                      onClick={() => setBrowserPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={browserSafePage >= browserTotalPages}
                      onClick={() => setBrowserPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </span>
                </p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Products List */}
      <div className="rounded-xl border border-border bg-card lg:col-span-3">
        <div className="border-b border-border px-5 py-4">
          <p className="text-sm text-muted-foreground">{products.length} Hotmail143 products</p>
        </div>
        <Table className="thead-material">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Product Type</TableHead>
              <TableHead>Account Type</TableHead>
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
                <TableCell className="text-muted-foreground">{product.externalProductType}</TableCell>
                <TableCell className="text-muted-foreground">{product.externalAccountType}</TableCell>
                <TableCell>BDT {product.price.toFixed(2)}</TableCell>
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
            <FieldLabel>Hotmail143 product type</FieldLabel>
            <Select
              value={form.externalProductType}
              onValueChange={handleProductTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a product type" />
              </SelectTrigger>
              <SelectContent>
                {productTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.value} ({opt.stock})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Hotmail143 account type</FieldLabel>
            <Select
              value={form.externalAccountType}
              onValueChange={handleAccountTypeChange}
              disabled={!form.externalProductType}
            >
              <SelectTrigger>
                <SelectValue placeholder={form.externalProductType ? "Select an account type" : "Select product type first"} />
              </SelectTrigger>
              <SelectContent>
                {accountTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.value} ({opt.stock})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {form.externalProductType && form.externalAccountType && matchedStock !== null && (
            <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
              Available stock: <span className="font-semibold text-foreground">{matchedStock}</span>
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
