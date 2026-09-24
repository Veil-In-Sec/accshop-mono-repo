import { jsonError, requireUser } from "@/lib/server/auth"
import { db } from "@/lib/server/db"
import { readJson } from "@/lib/server/http"
import { routeError } from "@/lib/server/upstream"
import { badRequest } from "@/lib/server/upstream"
import { getOrCreateWallet } from "@/lib/server/wallet"

/** Submits a deposit request for admin review. Does not credit the wallet immediately. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req)
    const body = await readJson<{
      paymentMethodId?: unknown
      amount?: unknown
      senderAccountNumber?: unknown
      transactionReference?: unknown
    }>(req)

    const paymentMethodId = Number(body.paymentMethodId)
    if (!Number.isInteger(paymentMethodId)) {
      return jsonError(400, "Select a payment method.")
    }
    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return jsonError(400, "Enter an amount greater than zero.")
    }
    if (amount > 1_000_000) {
      return jsonError(400, `Maximum deposit is ${(1_000_000).toFixed(2)}.`)
    }
    if (
      typeof body.senderAccountNumber !== "string" ||
      body.senderAccountNumber.trim().length < 1 ||
      body.senderAccountNumber.length > 120
    ) {
      return jsonError(400, "Enter the account number you sent the payment from.")
    }
    if (
      typeof body.transactionReference !== "string" ||
      body.transactionReference.trim().length < 1 ||
      body.transactionReference.length > 200
    ) {
      return jsonError(400, "Enter the transaction reference from your payment.")
    }
    const reference = body.transactionReference.trim()

    await getOrCreateWallet(user.id)

    const settings = await db.siteSetting.findUnique({ where: { id: 1 } })
    const minDeposit = settings ? Number(settings.minDepositUsd) : 5
    if (amount < minDeposit) {
      badRequest(`Minimum deposit is ${minDeposit.toFixed(2)}.`)
    }

    const method = await db.paymentMethod.findUnique({ where: { id: paymentMethodId } })
    if (!method || !method.enabled) {
      badRequest("Selected payment method is not available.")
    }

    // Prevent the same transaction reference being re-used to double-claim.
    const duplicate = await db.depositRequest.findFirst({
      where: { userId: user.id, transactionReference: reference },
      select: { id: true },
    })
    if (duplicate) {
      badRequest("This transaction reference was already submitted.")
    }

    const created = await db.depositRequest.create({
      data: {
        userId: user.id,
        paymentMethodId,
        amount: amount.toFixed(2),
        senderAccountNumber: (body.senderAccountNumber as string).trim() || null,
        transactionReference: reference,
        status: "pending",
      },
    })

    return Response.json({
      success: true,
      message: "Deposit request submitted. It will be reviewed shortly.",
      id: created.id,
    })
  } catch (e) {
    return routeError(e)
  }
}
