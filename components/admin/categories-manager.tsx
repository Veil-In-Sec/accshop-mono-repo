"use client"

import { Pencil, Plus, Trash2 } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import { createCategory, deleteCategory, updateCategory } from "@/app/actions/admin"
import type { AdminCategory } from "@/lib/api/endpoints"
import { Button } from "@/components/ui/button"
import { FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

type Cat = AdminCategory

export function CategoriesManager({ initialCategories }: { initialCategories: Cat[] }) {
  const [categories, setCategories] = React.useState<Cat[]>(initialCategories)
  const [newName, setNewName] = React.useState("")
  const [editingId, setEditingId] = React.useState<number | null>(null)
  const [editingName, setEditingName] = React.useState("")

  async function handleAdd() {
    const trimmed = newName.trim()
    if (!trimmed) {
      toast.error("Enter a category name.")
      return
    }
    try {
      const res = await createCategory(trimmed)
      if (res.success && res.category) {
        toast.success(`Category "${res.category.name}" created.`)
        setCategories((prev) => [...prev, res.category as Cat])
        setNewName("")
      } else {
        toast.error("Could not create category.")
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create category.")
    }
  }

  async function handleRename(c: Cat) {
    const trimmed = editingName.trim()
    if (!trimmed) {
      toast.error("Enter a category name.")
      return
    }
    try {
      const res = await updateCategory(c.id, { name: trimmed })
      if (res.success && res.category) {
        toast.success("Category renamed.")
        setCategories((prev) => prev.map((x) => (x.id === c.id ? (res.category as Cat) : x)))
        setEditingId(null)
      } else {
        toast.error("Could not rename category.")
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not rename category.")
    }
  }

  async function handleToggleActive(c: Cat) {
    try {
      const res = await updateCategory(c.id, { active: !c.active })
      if (res.success && res.category) {
        setCategories((prev) => prev.map((x) => (x.id === c.id ? (res.category as Cat) : x)))
        toast.success(res.category.active ? "Category activated." : "Category deactivated.")
      } else {
        toast.error("Could not update category.")
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update category.")
    }
  }

  async function handleDelete(c: Cat) {
    try {
      const res = await deleteCategory(c.id)
      if (res.success) {
        toast.success(`Category "${c.name}" deleted.`)
        setCategories((prev) => prev.filter((x) => x.id !== c.id))
      } else {
        toast.error("Could not delete category.")
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete category.")
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold text-foreground">Add category</h2>
        <p className="mt-1 text-sm text-muted-foreground">Create a custom category for the customer panel.</p>
        <div className="mt-4 flex items-end gap-3">
          <div className="flex-1">
            <FieldLabel htmlFor="new-category">Category name</FieldLabel>
            <Input
              id="new-category"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New category name"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd()
              }}
            />
          </div>
          <Button onClick={handleAdd} className="gap-1.5">
            <Plus className="size-4" />
            Add category
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold text-foreground">All categories</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Rename, activate/deactivate, or delete any category. Inactive categories are hidden from
          the customer panel.
        </p>

        {categories.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No categories yet.</p>
        ) : (
          <div className="mt-4 divide-y divide-border">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-3">
                {editingId === c.id ? (
                  <Input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(c)
                      if (e.key === "Escape") setEditingId(null)
                    }}
                    className="flex-1"
                  />
                ) : (
                  <span className="flex-1 text-sm font-medium text-card-foreground">{c.name}</span>
                )}

                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch checked={c.active} onCheckedChange={() => handleToggleActive(c)} />
                  {c.active ? "Active" : "Inactive"}
                </label>

                {editingId === c.id ? (
                  <Button size="sm" variant="secondary" onClick={() => handleRename(c)}>
                    Save
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => { setEditingId(c.id); setEditingName(c.name) }}>
                    <Pencil className="size-4" />
                  </Button>
                )}

                <Button size="sm" variant="ghost" className="text-risk" onClick={() => handleDelete(c)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
