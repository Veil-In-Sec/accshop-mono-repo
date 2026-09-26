"use client"

import { Pencil, Trash2, X } from "lucide-react"
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
}

export function CustomProductsTable({
  initialProducts,
  initialCategories,
}: {
  initialProducts: Product[]
  initialCategories: Array<{ id: number; name: string }>
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
    })
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
        stock: Number.parseInt(form.stock, 10) || 0,
        tag: form.tag.trim(),
        badge: form.badge.trim(),
        active: form.active,
        featured: form.featured,
        externalProductType: "",
        externalAccountType: "",
        supplier: "custom",
        bulkmailProductId: null,
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
        const updated = {
          id: form.id ?? Math.max(0, ...prev.map((p) => p.id)) + 1,
          slug,
          name: form.name.trim(),
          category: form.category.trim(),
          section: form.section,
          price: Number.parseFloat(form.price),
          originalPrice: form.originalPrice ? Number.parseFloat(form.originalPrice) : null,
          stock: Number.parseInt(form.stock, 10) || 0,
          tag: form.tag.trim(),
          badge: form.badge.trim(),
          active: form.active,
          featured: form.featured,
          externalProductType: "",
          externalAccountType: "",
          supplier: "custom",
          bulkmailProductId: null,
        }
        if (form.id) return prev.map((p) => (p.id === form.id ? updated : p))
        return [...prev, updated]
      })
    } else {
      toast.error((result as { message?: string }).message ?? "Could not save product.")
    }
  }

  async function handleDelete(id: number) {
    let result: Awaited<ReturnType<typeof deleteProduct>>
    try {
      result = await deleteProduct(id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete product.")
      return
    }
    if (result.success) {
      setProducts((prev) => prev.filter((p) => p.id !== id))
      toast.success("Product deleted.")
    } else {
      toast.error((result as { message?: string }).message ?? "Could not delete product.")
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
      supplier: product.supplier ?? "custom",
      bulkmailProductId: product.bulkmailProductId ?? null,
    })
    if (result.success) {
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, active: !p.active } : p)))
      toast.success(product.active ? "Product deactivated." : "Product activated.")
    }
  }

  const isEditing = form.id !== undefined

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Products List */}
      <div className="rounded-xl border border-border bg-card lg:col-span-3">
        <div className="border-b border-border px-5 py-4">
          <p className="text-sm text-muted-foreground">{products.length} custom products</p>
        </div>
        <Table className="thead-material">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
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
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
              />
            </Field>
          </div>
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
  )
}
