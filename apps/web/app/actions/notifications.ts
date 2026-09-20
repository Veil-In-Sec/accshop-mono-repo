"use server"

import { revalidatePath } from "next/cache"

import { serverApi } from "@/lib/api/endpoints"

export async function getNotifications() {
  return serverApi.notifications.list()
}

export async function getNotificationsUnreadCount() {
  try {
    return await serverApi.notifications.unreadCount()
  } catch {
    return { unread: 0 }
  }
}

export async function markNotificationRead(id: number) {
  const result = await serverApi.notifications.markRead(id)
  revalidatePath("/dashboard")
  return result
}

export async function markAllNotificationsRead() {
  const result = await serverApi.notifications.markAllRead()
  revalidatePath("/dashboard")
  return result
}
