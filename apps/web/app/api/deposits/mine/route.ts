import { requireUser } from "@/lib/server/auth"
import { db } from "@/lib/server/db"
import { routeError } from "@/lib/server/upstream"

/** The signed-in user's own deposit requests. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req)
    const rows = await db.depositRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    })
    const methodIds = [...new Set(rows.map((r) => r.paymentMethodId).filter(Boolean))] as number[]
    const methods =
      methodIds.length > 0
        ? await db.paymentMethod.findMany({ where: { id: { in: methodIds } } })
        : []
    const nameById = new Map(methods.map((m) => [m.id, m.name]))
    return Response.json(
      rows.map((r) => ({
        id: r.id,
        amount: Number(r.amount),
        currency: r.currency,
        status: r.status,
        paymentMethodId: r.paymentMethodId,
        paymentMethod: r.paymentMethodId ? (nameById.get(r.paymentMethodId) ?? "") : "",
        senderAccountNumber: r.senderAccountNumber ?? "",
        transactionReference: r.transactionReference ?? "",
        adminNote: r.adminNote ?? "",
        createdAt: r.createdAt.toISOString(),
      })),
    )
  } catch (e) {
    return routeError(e)
  }
}
