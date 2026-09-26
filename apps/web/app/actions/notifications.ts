"use server"

import { revalidatePath } from "next/cache"

import { db } from "@/lib/server/db"
import { requireActionUser } from "@/lib/server/action-context"

function toDto(n: {
  id: number
  userId: string
  type: string
  title: string
  body: string
  read: boolean
  createdAt: Date
}) {
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    body: n.body,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }
}

export async function getNotifications() {
  const user = await requireActionUser()
  const rows = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { id: "desc" },
    take: 30,
  })
  return rows.map(toDto)
}

export async function getNotificationsUnreadCount() {
  try {
    const user = await requireActionUser()
    const unread = await db.notification.count({ where: { userId: user.id, read: false } })
    return { unread }
  } catch {
    return { unread: 0 }
  }
}

export async function markNotificationRead(id: number) {
  const user = await requireActionUser()
  if (!Number.isInteger(id)) throw new Error("Invalid notification id.")
  await db.notification.updateMany({ where: { id, userId: user.id }, data: { read: true } })
  revalidatePath("/dashboard")
  return { success: true as const }
}

export async function markAllNotificationsRead() {
  const user = await requireActionUser()
  await db.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } })
  revalidatePath("/dashboard")
  return { success: true as const }
}
