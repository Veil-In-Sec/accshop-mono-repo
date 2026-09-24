import { requireUser } from "@/lib/server/auth"
import { routeError } from "@/lib/server/upstream"
import { getWalletData } from "@/lib/server/wallet"

/** Balance + order history + transactions for the signed-in user. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req)
    return Response.json(await getWalletData(user.id))
  } catch (e) {
    return routeError(e)
  }
}
