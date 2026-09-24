import { requireAdmin } from "@/lib/server/admin"
import { db } from "@/lib/server/db"
import { routeError } from "@/lib/server/upstream"

export async function GET(req: Request) {
  try {
    await requireAdmin(req)
    const unread = await db.supportMessage.count({
      where: { sender: "customer", read: false },
    })
    return Response.json({ unread })
  } catch (e) {
    return routeError(e)
  }
}
