import { jsonError, requireUser } from "@/lib/server/auth"
import { readJson } from "@/lib/server/http"
import { routeError } from "@/lib/server/upstream"
import { purchaseProduct } from "@/lib/server/wallet"

/** Places a product order, paid directly from the wallet (deposit) balance. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req)
    const body = await readJson<{
      productId?: unknown
      paymentMethodId?: unknown
      transactionReference?: unknown
      quantity?: unknown
      qty?: unknown
      senderAccountNumber?: unknown
    }>(req)

    const productId = Number(body.productId)
    if (!Number.isInteger(productId) || productId < 1) {
      return jsonError(400, "Invalid product.")
    }
    const qtyRaw = body.quantity ?? body.qty
    let qty: number | undefined
    if (qtyRaw !== undefined) {
      const n = Number(qtyRaw)
      if (!Number.isInteger(n) || n < 1 || n > 1000) {
        return jsonError(400, "Quantity must be an integer between 1 and 1000.")
      }
      qty = n
    }
    let paymentMethodId: number | undefined
    if (body.paymentMethodId !== undefined) {
      const n = Number(body.paymentMethodId)
      if (!Number.isInteger(n) || n < 1) {
        return jsonError(400, "Invalid payment method.")
      }
      paymentMethodId = n
    }
    let transactionReference: string | undefined
    if (body.transactionReference !== undefined) {
      if (typeof body.transactionReference !== "string") {
        return jsonError(400, "Invalid transaction reference.")
      }
      if (body.transactionReference.length > 200) {
        return jsonError(400, "Transaction reference is too long.")
      }
      transactionReference = body.transactionReference
    }
    let senderAccountNumber: string | undefined
    if (body.senderAccountNumber !== undefined) {
      if (typeof body.senderAccountNumber !== "string") {
        return jsonError(400, "Invalid sender account number.")
      }
      if (body.senderAccountNumber.length > 120) {
        return jsonError(400, "Sender account number is too long.")
      }
      senderAccountNumber = body.senderAccountNumber
    }

    return Response.json(
      await purchaseProduct(
        user.id,
        productId,
        paymentMethodId,
        transactionReference,
        qty,
        senderAccountNumber,
      ),
    )
  } catch (e) {
    return routeError(e)
  }
}
