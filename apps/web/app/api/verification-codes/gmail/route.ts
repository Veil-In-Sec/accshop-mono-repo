import { requireUser } from "@/lib/server/auth";
import { getGmailCode } from "@/lib/server/hotmail143";
import { assertOwnsEmail } from "@/lib/server/verification-codes";
import { badRequest, routeError } from "@/lib/server/upstream";

/**
 * GET /api/verification-codes/gmail?email=foo@gmail.com
 * Proxies Hotmail143 GET /gmail/code. Only owned (purchased) emails allowed.
 */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const email = new URL(req.url).searchParams.get("email") ?? "";

    // Manual GmailCodeQueryDto validation -> 400 (mirrors the Nest DTO bounds).
    if (typeof email !== "string" || email.length < 3 || email.length > 320) {
      badRequest("Enter a valid email address.");
    }
    const clean = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      badRequest("Enter a valid email address.");
    }
    await assertOwnsEmail(user.id, clean);
    return Response.json(await getGmailCode(clean));
  } catch (e) {
    return routeError(e);
  }
}
