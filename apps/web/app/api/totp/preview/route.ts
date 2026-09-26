import { requireUser } from "@/lib/server/auth";
import { readJson } from "@/lib/server/http";
import {
  TOTP_ALGORITHMS,
  assertValidSecret,
  generateTotp,
  parseOtpauthUri,
  type TotpAlgorithm,
} from "@/lib/server/totp-crypto";
import { HttpError, badRequest, routeError } from "@/lib/server/upstream";

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

/**
 * One-time code preview — validates the secret and returns the current live
 * code WITHOUT storing anything. The 2FA tab is a stateless tool: secrets
 * live only in the browser memory for the countdown, then are discarded.
 */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    // One call per rollover (~80/hr at 45s) plus retries — generous budget.
    checkRate(`totp:preview:${user.id}`, 300, 60 * 60 * 1000);

    const body = await readJson<{
      secret?: unknown;
      label?: unknown;
      issuer?: unknown;
      algorithm?: unknown;
      digits?: unknown;
      period?: unknown;
    }>(req);

    if (typeof body.secret !== "string" || body.secret.trim().length === 0) {
      badRequest("Secret key is required.");
    }
    if (body.secret.length > 2000) {
      badRequest("Secret key is too long.");
    }
    let algorithm: TotpAlgorithm | undefined;
    if (body.algorithm !== undefined) {
      if (!(TOTP_ALGORITHMS as readonly string[]).includes(body.algorithm as string)) {
        badRequest("Unsupported algorithm.");
      }
      algorithm = body.algorithm as TotpAlgorithm;
    }
    let digits: number | undefined;
    if (body.digits !== undefined) {
      const n = Number(body.digits);
      if (!Number.isInteger(n) || n < 6 || n > 8) {
        badRequest("Code length must be 6, 7 or 8 digits.");
      }
      digits = n;
    }
    let period: number | undefined;
    if (body.period !== undefined) {
      const n = Number(body.period);
      if (!Number.isInteger(n) || n < 15 || n > 120) {
        badRequest("Period must be 15 to 120 seconds.");
      }
      period = n;
    }

    let label = typeof body.label === "string" ? body.label.trim().slice(0, 80) : "";
    let issuer = typeof body.issuer === "string" ? body.issuer.trim().slice(0, 80) : "";
    let secret = body.secret.trim();
    let resolvedAlgorithm: TotpAlgorithm = algorithm ?? "SHA1";
    let resolvedDigits = digits ?? 6;
    let resolvedPeriod = period ?? 30;

    if (/^otpauth:\/\//i.test(secret)) {
      const parsed = parseOtpauthUri(secret);
      if (!label) label = parsed.label;
      if (!issuer) issuer = parsed.issuer;
      secret = parsed.secret;
      if (algorithm === undefined) resolvedAlgorithm = parsed.algorithm;
      if (digits === undefined) resolvedDigits = parsed.digits;
      if (period === undefined) resolvedPeriod = parsed.period;
    }
    if (!label) label = issuer || "One-time code";

    secret = assertValidSecret(secret);
    if (!(TOTP_ALGORITHMS as readonly string[]).includes(resolvedAlgorithm)) {
      badRequest("Unsupported algorithm.");
    }

    const { code, secondsRemaining } = generateTotp(secret, {
      algorithm: resolvedAlgorithm,
      digits: resolvedDigits,
      period: resolvedPeriod,
    });
    return Response.json({
      code,
      secondsRemaining,
      period: resolvedPeriod,
      digits: resolvedDigits,
      label,
      issuer,
    });
  } catch (e) {
    return routeError(e);
  }
}
