import { requireUser } from "@/lib/server/auth";
import { listMyEmails } from "@/lib/server/verification-codes";
import { routeError } from "@/lib/server/upstream";

/** Purchased emails for quick-pick dropdowns. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    return Response.json(await listMyEmails(user.id));
  } catch (e) {
    return routeError(e);
  }
}
