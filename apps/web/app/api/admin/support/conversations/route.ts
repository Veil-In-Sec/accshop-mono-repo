import { requireAdmin } from "@/lib/server/admin"
import { db } from "@/lib/server/db"
import { routeError } from "@/lib/server/upstream"

/** One entry per user: email, last message preview, unread (customer) count. */
export async function GET(req: Request) {
  try {
    await requireAdmin(req)
    // DB-side distinct users + counts; only the latest message per user is
    // fetched individually. Avoids loading 2000 rows into memory.
    const grouped = await db.supportMessage.groupBy({
      by: ["userId"],
      _count: { _all: true },
      _max: { id: true },
    })
    if (grouped.length === 0) return Response.json([])

    const maxIds = grouped.map((g) => g._max.id).filter((v): v is number => v != null)
    const [lastMessages, unreadGroups] = await Promise.all([
      maxIds.length > 0
        ? db.supportMessage.findMany({ where: { id: { in: maxIds } } })
        : [],
      db.supportMessage.groupBy({
        by: ["userId"],
        _count: { _all: true },
        where: { sender: "customer", read: false },
      }),
    ])
    const lastByUser = new Map(lastMessages.map((m) => [m.userId, m]))
    const unreadByUser = new Map(unreadGroups.map((g) => [g.userId, g._count._all]))
    const totalByUser = new Map(grouped.map((g) => [g.userId, g._count._all]))

    const userIds = [...lastByUser.keys()]
    const users =
      userIds.length > 0 ? await db.user.findMany({ where: { id: { in: userIds } } }) : []
    const emailByUserId = new Map(users.map((u) => [u.id, u.email]))
    const nameByUserId = new Map(users.map((u) => [u.id, u.name]))

    return Response.json(
      [...lastByUser.entries()]
        .map(([userId, last]) => ({
          userId,
          userEmail: emailByUserId.get(userId) ?? userId,
          userName: nameByUserId.get(userId) ?? "",
          lastText: last.text,
          lastSender: last.sender,
          lastAt: last.createdAt.toISOString(),
          unread: unreadByUser.get(userId) ?? 0,
          total: totalByUser.get(userId) ?? 0,
        }))
        .sort((a, b) => b.lastAt.localeCompare(a.lastAt)),
    )
  } catch (e) {
    return routeError(e)
  }
}
