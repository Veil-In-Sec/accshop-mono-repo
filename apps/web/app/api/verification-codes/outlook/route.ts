import { requireUser } from "@/lib/server/auth";
import { getGraphCode } from "@/lib/server/graph-mail";
import {
  assertOwnsEmail,
  findOwnedAccount,
} from "@/lib/server/verification-codes";
import { badRequest, routeError } from "@/lib/server/upstream";

/**
 * GET /api/verification-codes/outlook?email=foo@outlook.com
 * Fetches the verification code via the GraphMail API using the
 * refresh_token + client_id stored on the caller's completed order.
 * Only owned (purchased) emails allowed.
 */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const email = new URL(req.url).searchParams.get("email") ?? "";

    if (typeof email !== "string" || email.length < 3 || email.length > 320) {
      badRequest("Enter a valid Outlook/Hotmail address.");
    }
    const clean = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      badRequest("Enter a valid Outlook/Hotmail address.");
    }
    await assertOwnsEmail(user.id, clean);
    const stored = await findOwnedAccount(user.id, clean);
    if (!stored) {
      badRequest(
        "No saved refresh_token/client_id for this address — paste the full email|password|refresh_token|client_id line instead.",
      );
    }
    return Response.json(await getGraphCode({ ...stored, list_mail: "all" }));
  } catch (e) {
    return routeError(e);
  }
}
