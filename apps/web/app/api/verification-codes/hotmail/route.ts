import { requireUser } from "@/lib/server/auth";
import { readJson } from "@/lib/server/http";
import { getGraphCode, parseGraphLine } from "@/lib/server/graph-mail";
import {
  assertOwnsEmail,
  findOwnedAccount,
} from "@/lib/server/verification-codes";
import { badRequest, routeError } from "@/lib/server/upstream";

/**
 * POST /api/verification-codes/hotmail { data: "email|password|refresh_token|client_id" }
 * Fetches the verification code via the GraphMail API
 * (POST tools.dongvanfb.net/api/graph_messages).
 *
 * Accepts the full credentials line. A bare `email` / `email|password` line
 * works only when the caller's completed orders already store
 * refresh_token + client_id for that address (resolved server-side).
 * Returns a `{ kind: "graph", result }` envelope. Only emails from the
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
      const input = parseGraphLine(clean);
      return Response.json({ kind: "graph", result: await getGraphCode(input) });
    }

    // Email-only: resolve stored Graph credentials from the user's orders.
    const stored = await findOwnedAccount(user.id, email);
    if (stored) {
      return Response.json({
        kind: "graph",
        result: await getGraphCode({ ...stored, list_mail: "all" }),
      });
    }
    badRequest(
      "This mailbox needs its credentials line (email|password|refresh_token|client_id). Paste the full line from your order.",
    );
  } catch (e) {
    return routeError(e);
  }
}
