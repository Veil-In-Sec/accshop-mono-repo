"use client"

import { Eye, Trash2 } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { toast } from "sonner"

import { deleteUser } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { ClientDate } from "@/components/client-date"
import { formatMoney } from "@/lib/format"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type UserRow = {
  id: string
  name: string
  email: string
  balance: number
  createdAt: string
}

export function UsersTable({ initialUsers }: { initialUsers: UserRow[] }) {
  const [users, setUsers] = React.useState(initialUsers)
  const [query, setQuery] = React.useState("")
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [confirmId, setConfirmId] = React.useState<string | null>(null)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    )
  }, [users, query])

  async function handleDelete(userId: string) {
    setDeletingId(userId)
    const result = await deleteUser(userId)
    setDeletingId(null)
    if (!result.success) {
      toast.error(result.message ?? "Could not delete user.")
      return
    }
    toast.success(result.message ?? "User deleted.")
    setUsers((prev) => prev.filter((u) => u.id !== userId))
    setConfirmId(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email…"
            className="w-full rounded-full border border-border bg-card py-2.5 pl-11 pr-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
          />
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} of {users.length} user{users.length === 1 ? "" : "s"} • click a row to open the account dashboard
        </span>
      </div>
    <div className="rounded-xl border border-border bg-card">
      <Table className="thead-material">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((user) => (
            <TableRow key={user.id} className="group">
              <TableCell className="font-medium">
                <Link href={`/admin/users/${encodeURIComponent(user.id)}`} className="text-foreground hover:text-primary hover:underline">
                  {user.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                <Link href={`/admin/users/${encodeURIComponent(user.id)}`} className="hover:text-foreground hover:underline">
                  {user.email}
                </Link>
              </TableCell>
              <TableCell className="text-right font-semibold text-foreground">
                {formatMoney(user.balance)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                <ClientDate iso={user.createdAt} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Link
                    href={`/admin/users/${encodeURIComponent(user.id)}`}
                    className="inline-flex h-7 items-center justify-center gap-1 rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium text-foreground transition-all hover:bg-muted"
                  >
                    <Eye className="size-3.5" />
                    View
                  </Link>
                {confirmId === user.id ? (
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deletingId === user.id}
                      onClick={() => handleDelete(user.id)}
                    >
                      <Trash2 className="size-4" />
                      {deletingId === user.id ? "Deleting…" : "Confirm"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deletingId === user.id}
                      onClick={() => setConfirmId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setConfirmId(user.id)}>
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                {users.length === 0 ? "No users yet." : `No users match "${query}".`}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
    </div>
  )
}
