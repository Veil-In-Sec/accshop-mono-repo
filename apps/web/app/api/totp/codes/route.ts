import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import {
  TOTP_ALGORITHMS,
  generateTotp,
  type TotpAlgorithm,
} from "@/lib/server/totp-crypto";
import { decryptTotpSecret } from "@/lib/server/totp-vault";
import { HttpError, routeError } from "@/lib/server/upstream";

// NOTE (multi-instance limitation): in-memory sliding-window counters live in
// process memory — see the note in app/api/totp/keys/route.ts.
const hits = new Map<string, number[]>();

function checkRate(scope: string, limit: number, windowMs: number) {
  const now = Date.now();
  const kept = (hits.get(scope) ?? []).filter((t) => now - t < windowMs);
  if (kept.length >= limit) {
    throw new HttpError(429, "Too many requests — slow down and retry.");
  }
  kept.push(now);
  hits.set(scope, kept);
  if (hits.size > 20000) {
    for (const [k, v] of hits) {
      if (v.length === 0 || now - v[v.length - 1] > windowMs) hits.delete(k);
      if (hits.size <= 10000) break;
    }
  }
}

/** Current live code for every saved key — one request per refresh cycle. */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    checkRate(`totp:codes:${user.id}`, 120, 60 * 1000);

    const rows = await db.totpKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    return Response.json(
      rows.map((row) => {
        const secret = decryptTotpSecret(row.secretEncrypted);
        const algorithm = (TOTP_ALGORITHMS as readonly string[]).includes(row.algorithm)
          ? (row.algorithm as TotpAlgorithm)
          : "SHA1";
        const { code, secondsRemaining } = generateTotp(secret, {
          algorithm,
          digits: row.digits,
          period: row.period,
        });
        return {
          id: row.id,
          code,
          secondsRemaining,
          period: row.period,
          digits: row.digits,
        };
      }),
    );
  } catch (e) {
    return routeError(e);
  }
}
