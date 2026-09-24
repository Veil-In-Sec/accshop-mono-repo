import { db } from "./db"

/**
 * Creates a customer notification.
 * Mirrors NotificationsService.notify — call sites swallow errors like the
 * original so a notification failure never breaks a purchase/fulfillment.
 */
export async function notify(
  userId: string,
  type: string,
  title: string,
  body: string,
): Promise<void> {
  await db.notification.create({ data: { userId, type, title, body } })
}
