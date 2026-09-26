import { requireUser } from "@/lib/server/auth";
import { getGraphCode } from "@/lib/server/graph-mail";
import { getOutlookCode } from "@/lib/server/hotmail143";
import {
  assertOwnsEmail,
  findOwnedAccount,
} from "@/lib/server/verification-codes";
import { badRequest, routeError } from "@/lib/server/upstream";

/**
 * GET /api/verification-codes/outlook?email=foo@outlook.com
 * Fetches the verification code via the GraphMail API using the
 * refresh_token + client_id stored on the caller's completed order.
 * When the stored Graph token is dead (supplier rejects it), falls back
 * to Hotmail143's email-only lookup (follows renewals) for
 * hotmail143-supplied orders.
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
    try {
      return Response.json(await getGraphCode({ ...stored, type: "all" }));
    } catch (graphError) {
      // Dead Graph token → Hotmail143 email-only lookup (follows renewals).
      // Only useful when it actually delivers (success or waiting-retry);
      // otherwise the Graph error (dead token) is the actionable message.
      if ((stored.supplier ?? "hotmail143") === "hotmail143") {
        try {
          const fallback = await getOutlookCode(clean);
          if (fallback.successful || fallback.code === -2) {
            return Response.json({ kind: "outlook", result: fallback });
          }
        } catch {
          /* transport-level fallback failure — fall through to Graph error */
        }
      }
      throw graphError;
    }
  } catch (e) {
    return routeError(e);
  }
}
