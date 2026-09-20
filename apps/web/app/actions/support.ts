"use server"

import { serverApi } from "@/lib/api/endpoints"

/** Customer's own thread with the admin team (oldest first). */
export async function getSupportMessages() {
  return serverApi.support.messages()
}

/** Unread admin replies — drives the chat badge. */
export async function getSupportUnreadCount() {
  try {
    return await serverApi.support.unreadCount()
  } catch {
    return { unread: 0 }
  }
}

/** Send a message to the admin team. */
export async function sendSupportMessage(text: string) {
  return serverApi.support.send(text)
}
