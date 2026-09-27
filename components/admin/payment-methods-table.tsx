"use client"

import { Pencil, Plus, Trash2 } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"

import { deletePaymentMethod, upsertPaymentMethod } from "@/app/actions/admin"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"

type PaymentMethod = {
  id: number
  name: string
  type: string
  accountNumber: string
  accountName: string
  instructions: string
  icon: string
  enabled: boolean
  sortOrder: number
}

const TYPES = ["mobile_banking", "bank", "crypto", "other"]

const emptyForm = {
  id: undefined as number | undefined,
  name: "",
  type: "mobile_banking",
  accountNumber: "",
  accountName: "",
  instructions: "",
  icon: "",
  enabled: true,
  sortOrder: "0",
}

export function PaymentMethodsTable({ initialMethods }: { initialMethods: PaymentMethod[] }) {
  const [methods, setMethods] = React.useState(initialMethods)
  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState(emptyForm)
  const [isSaving, setIsSaving] = React.useState(false)

  function openCreate() {
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(method: PaymentMethod) {
    setForm({
      id: method.id,
      name: method.name,
      type: method.type,
      accountNumber: method.accountNumber,
      accountName: method.accountName,
      instructions: method.instructions,
      icon: method.icon,
      enabled: method.enabled,
      sortOrder: String(method.sortOrder),
    })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Name is required.")
      return
    }
    if (form.icon.trim() && !/^https?:\/\/.+/i.test(form.icon.trim())) {
      toast.error("Logo URL must start with http:// or https://.")
      return
    }
    setIsSaving(true)
    try {
      const result = await upsertPaymentMethod({
        id: form.id,
        name: form.name.trim(),
        type: form.type,
        accountNumber: form.accountNumber.trim(),
        accountName: form.accountName.trim(),
        instructions: form.instructions.trim(),
        icon: form.icon.trim(),
        enabled: form.enabled,
        sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
      })

      if (result.success) {
      toast.success(form.id ? "Payment method updated." : "Payment method created.")
      setOpen(false)
      setMethods((prev) => {
        const updated: PaymentMethod = {
          id: form.id ?? Math.max(0, ...prev.map((m) => m.id)) + 1,
          name: form.name.trim(),
          type: form.type,
          accountNumber: form.accountNumber.trim(),
          accountName: form.accountName.trim(),
          instructions: form.instructions.trim(),
          icon: form.icon.trim(),
          enabled: form.enabled,
          sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
        }
        if (form.id) return prev.map((m) => (m.id === form.id ? updated : m))
        return [...prev, updated]
      })
      } else {
        toast.error((result as { message?: string }).message ?? "Could not save payment method.")
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save payment method.")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: number) {
    try {
      const result = await deletePaymentMethod(id)
      if (result.success) {
        setMethods((prev) => prev.filter((m) => m.id !== id))
        toast.success("Payment method deleted.")
      } else {
        toast.error("Could not delete payment method.")
      }
    } catch (e) {
      // Backend blocks deletion when deposit requests reference the method
      // (history integrity) — surface its message with a one-click disable.
      const message = e instanceof Error ? e.message : "Could not delete payment method."
      toast.error(message, {
        duration: 8000,
        action: {
          label: "Disable instead",
          onClick: () => void disableMethod(id),
        },
      })
    }
  }

  async function disableMethod(id: number) {
    const method = methods.find((m) => m.id === id)
    if (!method) return
    if (!method.enabled) {
      toast.info("Already disabled.")
      return
    }
    try {
      const result = await upsertPaymentMethod({
        id: method.id,
        name: method.name,
        type: method.type,
        accountNumber: method.accountNumber,
        accountName: method.accountName,
        instructions: method.instructions,
        icon: method.icon,
        enabled: false,
        sortOrder: method.sortOrder,
      })
      if (result.success) {
        setMethods((prev) => prev.map((m) => (m.id === id ? { ...m, enabled: false } : m)))
        toast.success(`"${method.name}" disabled — kept for deposit history.`)
      } else {
        toast.error("Could not disable payment method.")
      }
    } catch {
      toast.error("Could not disable payment method.")
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <p className="text-sm text-muted-foreground">{methods.length} payment methods</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button size="sm" onClick={openCreate} className="gap-1.5">
                <Plus className="size-4" />
                Add method
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit payment method" : "Add payment method"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <Field className="col-span-2">
                <FieldLabel htmlFor="pm-name">Name</FieldLabel>
                <Input id="pm-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field>
                <FieldLabel>Type</FieldLabel>
                <Select value={form.type} onValueChange={(value) => value && setForm({ ...form, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="pm-sort">Sort order</FieldLabel>
                <Input
                  id="pm-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="pm-account-number">Account number</FieldLabel>
                <Input
                  id="pm-account-number"
                  value={form.accountNumber}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="pm-account-name">Account name</FieldLabel>
                <Input
                  id="pm-account-name"
                  value={form.accountName}
                  onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                />
              </Field>
              <Field className="col-span-2">
                <FieldLabel htmlFor="pm-instructions">Instructions</FieldLabel>
                <Textarea
                  id="pm-instructions"
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                />
              </Field>
              <Field className="col-span-2">
                <FieldLabel htmlFor="pm-icon">Logo image URL</FieldLabel>
                <div className="flex items-center gap-3">
                  {form.icon.trim() ? (
                    <img
                      key={form.icon.trim()}
                      src={form.icon.trim()}
                      alt="Logo preview"
                      className="size-10 shrink-0 rounded-lg border border-white/10 bg-white object-contain"
                      onError={(e) => { e.currentTarget.style.display = "none" }}
                    />
                  ) : null}
                  <Input
                    id="pm-icon"
                    type="url"
                    inputMode="url"
                    maxLength={500}
                    placeholder="https://example.com/bkash-logo.png"
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    className="flex-1"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Paste a direct image link (https://…). Shown as the gateway logo on the deposit page.
                </p>
              </Field>
              <Field className="col-span-2 flex-row items-center justify-between">
                <FieldLabel htmlFor="pm-enabled">Enabled</FieldLabel>
                <Switch
                  id="pm-enabled"
                  checked={form.enabled}
                  onCheckedChange={(checked) => setForm({ ...form, enabled: checked })}
                />
              </Field>
            </div>
            <DialogFooter>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save method"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Table className="thead-material">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {methods.map((method) => (
            <TableRow key={method.id}>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  {method.icon ? (
                    <img
                      src={method.icon}
                      alt=""
                      className="size-8 shrink-0 rounded-md border border-white/10 bg-white object-contain"
                    />
                  ) : null}
                  <span className="font-medium text-foreground">{method.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{method.type}</TableCell>
              <TableCell className="text-muted-foreground">{method.accountNumber || "—"}</TableCell>
              <TableCell>
                <Badge variant={method.enabled ? "default" : "secondary"}>
                  {method.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(method)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(method.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
