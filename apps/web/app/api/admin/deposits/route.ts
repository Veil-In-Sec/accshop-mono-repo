import { requireAdmin } from "@/lib/server/admin"
import { db } from "@/lib/server/db"
import { routeError } from "@/lib/server/upstream"

export async function GET(req: Request) {
  try {
    await requireAdmin(req)
    const status = new URL(req.url).searchParams.get("status") ?? undefined
    const allowed = ["pending", "approved", "rejected"]
    const rows = await db.depositRequest.findMany({
      where: status && allowed.includes(status) ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
    })

    const userIds = [...new Set(rows.map((r) => r.userId))]
    const users =
      userIds.length > 0 ? await db.user.findMany({ where: { id: { in: userIds } } }) : []
    const emailByUserId = new Map(users.map((u) => [u.id, u.email]))

    const methodIds = [...new Set(rows.map((r) => r.paymentMethodId).filter(Boolean))] as number[]
    const methods =
      methodIds.length > 0
        ? await db.paymentMethod.findMany({ where: { id: { in: methodIds } } })
        : []
    const nameById = new Map(methods.map((m) => [m.id, m.name]))

    return Response.json(
      rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        userEmail: emailByUserId.get(r.userId) ?? r.userId,
        paymentMethodId: r.paymentMethodId,
        paymentMethod: r.paymentMethodId ? (nameById.get(r.paymentMethodId) ?? "") : "",
        amount: Number(r.amount),
        currency: r.currency,
        senderAccountNumber: r.senderAccountNumber ?? "",
        transactionReference: r.transactionReference ?? "",
        status: r.status,
        adminNote: r.adminNote ?? "",
        createdAt: r.createdAt.toISOString(),
        reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
      })),
    )
  } catch (e) {
    return routeError(e)
  }
}
