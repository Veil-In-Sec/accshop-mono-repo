import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { readJson } from "@/lib/server/http";
import {
  TOTP_ALGORITHMS,
  assertValidSecret,
  generateTotp,
  parseOtpauthUri,
  type TotpAlgorithm,
} from "@/lib/server/totp-crypto";
import { encryptTotpSecret } from "@/lib/server/totp-vault";
import { HttpError, badRequest, routeError } from "@/lib/server/upstream";

const MAX_KEYS_PER_USER = 50;

// NOTE (multi-instance limitation): in-memory sliding-window counters live in
// process memory. On multi-instance / serverless deployments each instance
// enforces its own budget, so the effective limit is N× per instance count.
// Same trade-off as the NestJS single-instance Map in the source.
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

function toMeta(row: {
  id: number;
  label: string;
  issuer: string;
  algorithm: string;
  digits: number;
  period: number;
  createdAt: Date;
}) {
  return {
    id: row.id,
    label: row.label,
    issuer: row.issuer,
    algorithm: row.algorithm,
    digits: row.digits,
    period: row.period,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Saved keys (metadata only — never secrets). */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const rows = await db.totpKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });
    return Response.json(rows.map(toMeta));
  } catch (e) {
    return routeError(e);
  }
}

interface CreateKeyBody {
  secret?: unknown;
  "otpauth-uri"?: unknown;
  otpauthUri?: unknown;
  label?: unknown;
  issuer?: unknown;
  algorithm?: unknown;
  digits?: unknown;
  period?: unknown;
}

/** Save a key. Accepts a raw Base32 secret or an otpauth:// URI. */
export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    checkRate(`totp:create:${user.id}`, 30, 60 * 60 * 1000);

    const body = await readJson<CreateKeyBody>(req);

    // Manual CreateTotpKeyDto validation -> 400 (mirrors the Nest DTO bounds).
    const rawSecret =
      typeof body.secret === "string"
        ? body.secret
        : typeof body["otpauth-uri"] === "string"
          ? body["otpauth-uri"]
          : typeof body.otpauthUri === "string"
            ? body.otpauthUri
            : undefined;
    if (rawSecret === undefined || rawSecret.trim().length === 0) {
      badRequest("Secret key is required.");
    }
    if (rawSecret.length > 2000) {
      badRequest("Secret key is too long.");
    }
    if (body.label !== undefined) {
      if (typeof body.label !== "string" || body.label.length > 80) {
        badRequest("label must be a string of at most 80 characters.");
      }
    }
    if (body.issuer !== undefined) {
      if (typeof body.issuer !== "string" || body.issuer.length > 80) {
        badRequest("issuer must be a string of at most 80 characters.");
      }
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

    const count = await db.totpKey.count({ where: { userId: user.id } });
    if (count >= MAX_KEYS_PER_USER) {
      badRequest(`You can save up to ${MAX_KEYS_PER_USER} keys. Delete one to add another.`);
    }

    let label = (body.label as string | undefined)?.trim() ?? "";
    let issuer = (body.issuer as string | undefined)?.trim() ?? "";
    let secret = rawSecret.trim();
    let resolvedAlgorithm: TotpAlgorithm = algorithm ?? "SHA1";
    let resolvedDigits = digits ?? 6;
    let resolvedPeriod = period ?? 30;

    // Accept a full otpauth:// URI (from QR scans) as well as raw secrets.
    // Explicit fields always win over URI values.
    if (/^otpauth:\/\//i.test(secret)) {
      const parsed = parseOtpauthUri(secret);
      if (!label) label = parsed.label;
      if (!issuer) issuer = parsed.issuer;
      secret = parsed.secret;
      if (algorithm === undefined) resolvedAlgorithm = parsed.algorithm;
      if (digits === undefined) resolvedDigits = parsed.digits;
      if (period === undefined) resolvedPeriod = parsed.period;
    }
    if (!label) label = issuer || "Untitled key";

    secret = assertValidSecret(secret);
    if (!(TOTP_ALGORITHMS as readonly string[]).includes(resolvedAlgorithm)) {
      badRequest("Unsupported algorithm.");
    }

    const created = await db.totpKey.create({
      data: {
        userId: user.id,
        label: label.slice(0, 80),
        issuer: issuer.slice(0, 80),
        secretEncrypted: encryptTotpSecret(secret),
        algorithm: resolvedAlgorithm,
        digits: resolvedDigits,
        period: resolvedPeriod,
      },
    });

    // Immediate preview so the UI can confirm the key works.
    const preview = generateTotp(secret, {
      algorithm: resolvedAlgorithm,
      digits: resolvedDigits,
      period: resolvedPeriod,
    });
    return Response.json({ ...toMeta(created), preview });
  } catch (e) {
    return routeError(e);
  }
}
