"use server"

import { revalidatePath } from "next/cache"

import { db } from "@/lib/server/db"
import { requireActionUser } from "@/lib/server/action-context"

function toMessageDto(m: {
  id: number
  userId: string
  sender: string
  text: string
  read: boolean
  createdAt: Date
}) {
  return {
    id: m.id,
    userId: m.userId,
    sender: m.sender,
    text: m.text,
    read: m.read,
    createdAt: m.createdAt.toISOString(),
  }
}

/** Customer's own thread with the admin team (oldest first). */
export async function getSupportMessages() {
  const user = await requireActionUser()
  const [rows] = await Promise.all([
    db.supportMessage.findMany({
      where: { userId: user.id },
      orderBy: { id: "asc" },
      take: 500,
    }),
    db.supportMessage.updateMany({
      where: { userId: user.id, sender: "admin", read: false },
      data: { read: true },
    }),
  ])
  return rows.map(toMessageDto)
}

/** Unread admin replies — drives the chat badge. */
export async function getSupportUnreadCount() {
  try {
    const user = await requireActionUser()
    const count = await db.supportMessage.count({
      where: { userId: user.id, sender: "admin", read: false },
    })
    return { unread: count }
  } catch {
    return { unread: 0 }
  }
}

/** Send a message to the admin team. */
export async function sendSupportMessage(text: string) {
  const user = await requireActionUser()
  const clean = typeof text === "string" ? text.trim() : ""
  if (!clean) throw new Error("Message cannot be empty.")
  if (clean.length > 2000) throw new Error("Message is too long (max 2000 characters).")
  const created = await db.supportMessage.create({
    data: { userId: user.id, sender: "customer", text: clean },
  })
  revalidatePath("/dashboard")
  return { success: true as const, message: toMessageDto(created) }
}
