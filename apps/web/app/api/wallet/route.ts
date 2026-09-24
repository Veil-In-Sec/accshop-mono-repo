import { requireUser } from "@/lib/server/auth"
import { routeError } from "@/lib/server/upstream"
import { getOrCreateWallet } from "@/lib/server/wallet"

/** Ensures the wallet exists and returns it. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req)
    const wallet = await getOrCreateWallet(user.id)
    return Response.json(wallet)
  } catch (e) {
    return routeError(e)
  }
}
