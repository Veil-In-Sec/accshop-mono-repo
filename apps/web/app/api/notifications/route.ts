import { requireUser } from "@/lib/server/auth"
import { db } from "@/lib/server/db"
import { routeError } from "@/lib/server/upstream"

function toDto(n: {
  id: number
  userId: string
  type: string
  title: string
  body: string
  read: boolean
  createdAt: Date
}) {
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    body: n.body,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }
}

export async function GET(req: Request) {
  try {
    const user = await requireUser(req)
    const rows = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { id: "desc" },
      take: 30,
    })
    return Response.json(rows.map(toDto))
  } catch (e) {
    return routeError(e)
  }
}
