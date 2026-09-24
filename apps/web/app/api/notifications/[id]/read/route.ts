import { jsonError, requireUser } from "@/lib/server/auth"
import { db } from "@/lib/server/db"
import { routeError } from "@/lib/server/upstream"

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(req)
    const { id: idParam } = await ctx.params
    const id = Number(idParam)
    if (!Number.isInteger(id)) {
      return jsonError(400, "Invalid notification id.")
    }
    await db.notification.updateMany({ where: { id, userId: user.id }, data: { read: true } })
    return Response.json({ success: true })
  } catch (e) {
    return routeError(e)
  }
}
