import { requireAdmin } from "@/lib/server/admin"
import { jsonError } from "@/lib/server/auth"
import { db } from "@/lib/server/db"
import { readJson } from "@/lib/server/http"
import { badRequest, routeError } from "@/lib/server/upstream"

/** Approving credits the wallet. Atomic claim prevents double-credit races. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(req)
    const { id: idParam } = await ctx.params
    const id = Number(idParam)
    if (!Number.isInteger(id)) {
      return jsonError(400, "Invalid deposit id.")
    }
    const body = await readJson<{ decision?: unknown; note?: unknown }>(req)
    const decision = body.decision
    if (decision !== "approved" && decision !== "rejected") {
      return jsonError(400, "Invalid decision.")
    }
    if (body.note !== undefined && typeof body.note !== "string") {
      return jsonError(400, "Invalid note.")
    }
    const note = typeof body.note === "string" ? body.note : undefined
    if (note !== undefined && note.length > 1000) {
      return jsonError(400, "Note is too long.")
    }

    if (decision === "rejected") {
      const claimed = await db.depositRequest.updateMany({
        where: { id, status: "pending" },
        data: { status: decision, adminNote: note || null, reviewedAt: new Date() },
      })
      if (claimed.count === 0) {
        badRequest("This request has already been reviewed.")
      }
      return Response.json({ success: true, message: `Deposit ${decision}.` })
    }

    await db.$transaction(async (tx) => {
      // Atomically claim the request: only one concurrent reviewer wins.
      const claimed = await tx.depositRequest.updateMany({
        where: { id, status: "pending" },
        data: { status: "approved", adminNote: note || null, reviewedAt: new Date() },
      })
      if (claimed.count === 0) {
        badRequest("This request has already been reviewed.")
      }

      const request = await tx.depositRequest.findUniqueOrThrow({ where: { id } })

      // Atomic increment avoids lost-update races with concurrent
      // adjustments / approvals for the same user.
      const wallet = await tx.wallet.upsert({
        where: { userId: request.userId },
        create: { userId: request.userId, balance: Number(request.amount).toFixed(2) },
        update: { balance: { increment: Number(request.amount) }, updatedAt: new Date() },
      })

      await tx.transaction.create({
        data: {
          userId: request.userId,
          type: "deposit",
          description: "Wallet deposit approved",
          amount: Number(request.amount).toFixed(2),
          balanceAfter: Number(wallet.balance).toFixed(2),
          status: "completed",
        },
      })
    })

    return Response.json({ success: true, message: `Deposit ${decision}.` })
  } catch (e) {
    return routeError(e)
  }
}
