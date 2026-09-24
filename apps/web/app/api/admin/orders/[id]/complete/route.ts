import { requireAdmin } from "@/lib/server/admin";
import { jsonError } from "@/lib/server/auth";
import { fulfill } from "@/lib/server/fulfillment";
import { routeError } from "@/lib/server/upstream";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(req);
  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isInteger(id)) throw jsonError(400, "Invalid order id.");

  // Retry endpoint for a stuck order. Instant checkout already fulfills via
  // the shared fulfillment helper — this delegates to the same logic.
  // NOTE (port difference): NestJS let fulfillment errors propagate (500 for
  // unknown errors); here they are mapped with routeError (HttpError -> its
  // status, unknown -> 500) so the admin UI gets JSON.
  try {
    const fulfilled = await fulfill(id);
    return Response.json({
      success: true,
      message: `Order fulfilled — ${fulfilled.accounts.length} account(s) delivered.`,
      remainingBalance: fulfilled.remainingBalance,
      accounts: fulfilled.accounts,
    });
  } catch (error) {
    throw routeError(error);
  }
}
