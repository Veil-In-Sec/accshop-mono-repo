import { jsonError, requireUser } from "@/lib/server/auth"
import { db } from "@/lib/server/db"
import { readJson } from "@/lib/server/http"
import { routeError } from "@/lib/server/upstream"

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

/** Own thread with the admin team (oldest first). Marks admin replies as read. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req)
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
    return Response.json(rows.map(toMessageDto))
  } catch (e) {
    return routeError(e)
  }
}

/** Send a message to the admin team. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req)
    const body = await readJson<{ text?: unknown }>(req)
    const text = typeof body.text === "string" ? body.text.trim() : ""
    if (!text) {
      return jsonError(400, "Message cannot be empty.")
    }
    if (text.length > 2000) {
      return jsonError(400, "Message is too long (max 2000 characters).")
    }
    const created = await db.supportMessage.create({
      data: { userId: user.id, sender: "customer", text },
    })
    return Response.json({ success: true, message: toMessageDto(created) })
  } catch (e) {
    return routeError(e)
  }
}
