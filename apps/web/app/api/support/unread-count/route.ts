import { requireUser } from "@/lib/server/auth"
import { db } from "@/lib/server/db"
import { routeError } from "@/lib/server/upstream"

/** Unread admin replies for the chat badge. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req)
    const count = await db.supportMessage.count({
      where: { userId: user.id, sender: "admin", read: false },
    })
    return Response.json({ unread: count })
  } catch (e) {
    return routeError(e)
  }
}
