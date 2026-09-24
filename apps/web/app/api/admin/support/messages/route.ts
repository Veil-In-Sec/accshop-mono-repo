import { requireAdmin } from "@/lib/server/admin"
import { jsonError } from "@/lib/server/auth"
import { db } from "@/lib/server/db"
import { readJson } from "@/lib/server/http"
import { badRequest, routeError } from "@/lib/server/upstream"

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

/** Full thread for one user (oldest first). Marks customer messages as read. */
export async function GET(req: Request) {
  try {
    await requireAdmin(req)
    const userId = new URL(req.url).searchParams.get("userId")
    if (!userId) {
      return jsonError(400, "userId is required.")
    }
    const user = await db.user.findUnique({ where: { id: userId } })
    const [rows] = await Promise.all([
      db.supportMessage.findMany({
        where: { userId },
        orderBy: { id: "asc" },
        take: 500,
      }),
      db.supportMessage.updateMany({
        where: { userId, sender: "customer", read: false },
        data: { read: true },
      }),
    ])
    return Response.json({
      userId,
      userEmail: user?.email ?? userId,
      userName: user?.name ?? "",
      messages: rows.map(toMessageDto),
    })
  } catch (e) {
    return routeError(e)
  }
}

/** Reply to a user as admin. */
export async function POST(req: Request) {
  try {
    await requireAdmin(req)
    const body = await readJson<{ userId?: unknown; text?: unknown }>(req)
    const userId = typeof body.userId === "string" ? body.userId : ""
    if (!userId) {
      return jsonError(400, "userId is required.")
    }
    const text = typeof body.text === "string" ? body.text.trim() : ""
    if (!text) {
      return jsonError(400, "Message cannot be empty.")
    }
    if (text.length > 2000) {
      return jsonError(400, "Message is too long (max 2000 characters).")
    }
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) badRequest("User not found.")
    const created = await db.supportMessage.create({
      data: { userId, sender: "admin", text },
    })
    return Response.json({ success: true, message: toMessageDto(created) })
  } catch (e) {
    return routeError(e)
  }
}
