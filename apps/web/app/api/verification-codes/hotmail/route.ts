import { requireUser } from "@/lib/server/auth";
import { readJson } from "@/lib/server/http";
import { getGraphCode, parseGraphLine } from "@/lib/server/graph-mail";
import { getHotmailCode, getOutlookCode } from "@/lib/server/hotmail143";
import {
  assertOwnsEmail,
  findOwnedAccount,
  findOrderSupplier,
} from "@/lib/server/verification-codes";
import { badRequest, routeError } from "@/lib/server/upstream";

/**
 * POST /api/verification-codes/hotmail { data: "email|password|refresh_token|client_id" }
 * Fetches the verification code via the GraphMail API
 * (POST tools.dongvanfb.net/api/graph_code — same endpoint the
 * supplier's own get_code_mail page uses).
 *
 * Accepts the full credentials line. A bare `email` / `email|password` line
 * works only when the caller's completed orders already store
 * refresh_token + client_id for that address (resolved server-side).
 * When Graph rejects the credentials but the mailbox was supplied by
 * Hotmail143, falls back to Hotmail143's own lookup (hotmail-code for a
 * full line, outlook-code email-only otherwise — follows renewals).
 * Returns a `{ kind, result }` envelope. Only emails from the
 * caller's completed orders are allowed.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = await readJson<{ data?: unknown }>(req);

    if (typeof body.data !== "string" || body.data.length < 5 || body.data.length > 8000) {
      badRequest("Enter a valid email address or credentials line.");
    }

    const clean = body.data.trim();
    const parts = clean
      .split("|")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    const email = parts[0] ?? "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      badRequest("Enter a valid email address or credentials line.");
    }
    await assertOwnsEmail(user.id, email);

    if (parts.length >= 3) {
      try {
        const input = parseGraphLine(clean);
        return Response.json({ kind: "graph", result: await getGraphCode(input) });
      } catch (graphError) {
        // Dead Graph token → Hotmail143 lookup with the same line.
        // Only useful when it actually delivers (success or waiting-retry).
        const supplier = await findOrderSupplier(user.id, email);
        if (supplier === "hotmail143") {
          try {
            const fallback = await getHotmailCode(clean);
            if (fallback.successful || fallback.code === -2) {
              return Response.json({ kind: "hotmail", result: fallback });
            }
          } catch {
            /* transport-level fallback failure — fall through to Graph error */
          }
        }
        throw graphError;
      }
    }

    // Email-only: resolve stored Graph credentials from the user's orders.
    const stored = await findOwnedAccount(user.id, email);
    if (stored) {
      try {
        return Response.json({
          kind: "graph",
          result: await getGraphCode({ ...stored, type: "all" }),
        });
      } catch (graphError) {
        if ((stored.supplier ?? "hotmail143") === "hotmail143") {
          try {
            const fallback = await getOutlookCode(email);
            if (fallback.successful || fallback.code === -2) {
              return Response.json({ kind: "outlook", result: fallback });
            }
          } catch {
            /* transport-level fallback failure — fall through to Graph error */
          }
        }
        throw graphError;
      }
    }
    badRequest(
      "This mailbox needs its credentials line (email|password|refresh_token|client_id). Paste the full line from your order.",
    );
  } catch (e) {
    return routeError(e);
  }
}
