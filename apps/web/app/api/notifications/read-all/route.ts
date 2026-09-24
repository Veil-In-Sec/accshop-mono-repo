import { requireUser } from "@/lib/server/auth"
import { db } from "@/lib/server/db"
import { routeError } from "@/lib/server/upstream"

export async function POST(req: Request) {
  try {
    const user = await requireUser(req)
    await db.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } })
    return Response.json({ success: true })
  } catch (e) {
    return routeError(e)
  }
}
