import { requireUser } from "@/lib/server/auth"
import { routeError } from "@/lib/server/upstream"
import { initializeAccount } from "@/lib/server/wallet"

/** Seeds the wallet after sign-up. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req)
    return Response.json(await initializeAccount(user.id))
  } catch (e) {
    return routeError(e)
  }
}
