import { jsonError, requireUser } from "@/lib/server/auth"
import { readJson } from "@/lib/server/http"
import { routeError } from "@/lib/server/upstream"
import { transferBalance } from "@/lib/server/wallet"

/** Sends balance to another AccShop account by email. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req)
    const body = await readJson<{ recipientEmail?: unknown; amount?: unknown }>(req)

    const recipientEmail = typeof body.recipientEmail === "string" ? body.recipientEmail : ""
    const amount = Number(body.amount)
    if (
      !recipientEmail ||
      recipientEmail.length > 320 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim().toLowerCase())
    ) {
      return jsonError(400, "Enter a valid recipient email address.")
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
      return jsonError(400, "Enter an amount greater than zero.")
    }

    return Response.json(await transferBalance(user.id, recipientEmail, amount))
  } catch (e) {
    return routeError(e)
  }
}
