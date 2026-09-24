import { requireUser } from "@/lib/server/auth"
import { db } from "@/lib/server/db"
import { routeError } from "@/lib/server/upstream"

export async function GET(req: Request) {
  try {
    const user = await requireUser(req)
    const unread = await db.notification.count({ where: { userId: user.id, read: false } })
    return Response.json({ unread })
  } catch (e) {
    return routeError(e)
  }
}
