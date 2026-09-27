"use server"

import { db } from "@/lib/server/db"
import { actionErrorMessage, requireActionUser } from "@/lib/server/action-context"
import {
  TOTP_ALGORITHMS,
  assertValidSecret,
  generateTotp,
  parseOtpauthUri,
  type TotpAlgorithm,
} from "@/lib/server/totp-crypto"
import { decryptTotpSecret, encryptTotpSecret } from "@/lib/server/totp-vault"
import { HttpError } from "@/lib/server/upstream"

const MAX_KEYS_PER_USER = 1

// In-memory sliding-window rate counters (same trade-off as the old routes:
// per-process budgets).
const hits = new Map<string, number[]>()

function checkRate(scope: string, limit: number, windowMs: number) {
  const now = Date.now()
  const kept = (hits.get(scope) ?? []).filter((t) => now - t < windowMs)
  if (kept.length >= limit) {
    throw new HttpError(429, "Too many requests — slow down and retry.")
  }
  kept.push(now)
  hits.set(scope, kept)
  if (hits.size > 20000) {
    for (const [k, v] of hits) {
      if (v.length === 0 || now - v[v.length - 1] > windowMs) hits.delete(k)
      if (hits.size <= 10000) break
    }
  }
}

function toMeta(row: {
  id: number
  label: string
  issuer: string
  algorithm: string
  digits: number
  period: number
  createdAt: Date
}) {
  return {
    id: row.id,
    label: row.label,
    issuer: row.issuer,
    algorithm: row.algorithm,
    digits: row.digits,
    period: row.period,
    createdAt: row.createdAt.toISOString(),
  }
}

export interface TotpCreateInput {
  label?: string
  issuer?: string
  secret: string
  algorithm?: "SHA1" | "SHA256" | "SHA512"
  digits?: number
  period?: number
}

export async function listTotpKeys() {
  try {
    const user = await requireActionUser()
    const rows = await db.totpKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    })
    return rows.map(toMeta)
  } catch {
    return []
  }
}

export async function fetchTotpCodes() {
  try {
    const user = await requireActionUser()
    checkRate(`totp:codes:${user.id}`, 120, 60 * 1000)
    const rows = await db.totpKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    })
    const data = rows.map((row) => {
      const secret = decryptTotpSecret(row.secretEncrypted)
      const algorithm = (TOTP_ALGORITHMS as readonly string[]).includes(row.algorithm)
        ? (row.algorithm as TotpAlgorithm)
        : "SHA1"
      const { code, secondsRemaining } = generateTotp(secret, {
        algorithm,
        digits: row.digits,
        period: row.period,
      })
      return {
        id: row.id,
        code,
        secondsRemaining,
        period: row.period,
        digits: row.digits,
      }
    })
    return { ok: true as const, data }
  } catch (e) {
    return { ok: false as const, message: actionErrorMessage(e, "Could not fetch 2FA codes.") }
  }
}

export async function addTotpKey(input: TotpCreateInput) {
  try {
    const user = await requireActionUser()
    checkRate(`totp:create:${user.id}`, 30, 60 * 60 * 1000)

    const rawSecret = typeof input.secret === "string" ? input.secret : undefined
    if (rawSecret === undefined || rawSecret.trim().length === 0) {
      throw new Error("Secret key is required.")
    }
    if (rawSecret.length > 2000) throw new Error("Secret key is too long.")
    if (input.label !== undefined) {
      if (typeof input.label !== "string" || input.label.length > 80) {
        throw new Error("label must be a string of at most 80 characters.")
      }
    }
    if (input.issuer !== undefined) {
      if (typeof input.issuer !== "string" || input.issuer.length > 80) {
        throw new Error("issuer must be a string of at most 80 characters.")
      }
    }
    let algorithm: TotpAlgorithm | undefined
    if (input.algorithm !== undefined) {
      if (!(TOTP_ALGORITHMS as readonly string[]).includes(input.algorithm as string)) {
        throw new Error("Unsupported algorithm.")
      }
      algorithm = input.algorithm as TotpAlgorithm
    }
    let digits: number | undefined
    if (input.digits !== undefined) {
      const n = Number(input.digits)
      if (!Number.isInteger(n) || n < 6 || n > 8) {
        throw new Error("Code length must be 6, 7 or 8 digits.")
      }
      digits = n
    }
    let period: number | undefined
    if (input.period !== undefined) {
      const n = Number(input.period)
      if (!Number.isInteger(n) || n < 15 || n > 120) {
        throw new Error("Period must be 15 to 120 seconds.")
      }
      period = n
    }

    const count = await db.totpKey.count({ where: { userId: user.id } })
    if (count >= MAX_KEYS_PER_USER) {
      throw new Error("One-time tool: finish or discard the current code before adding another.")
    }

    let label = input.label?.trim() ?? ""
    let issuer = input.issuer?.trim() ?? ""
    let secret = rawSecret.trim()
    let resolvedAlgorithm: TotpAlgorithm = algorithm ?? "SHA1"
    let resolvedDigits = digits ?? 6
    let resolvedPeriod = period ?? 30

    if (/^otpauth:\/\//i.test(secret)) {
      const parsed = parseOtpauthUri(secret)
      if (!label) label = parsed.label
      if (!issuer) issuer = parsed.issuer
      secret = parsed.secret
      if (algorithm === undefined) resolvedAlgorithm = parsed.algorithm
      if (digits === undefined) resolvedDigits = parsed.digits
      if (period === undefined) resolvedPeriod = parsed.period
    }
    if (!label) label = issuer || "Untitled key"

    secret = assertValidSecret(secret)
    if (!(TOTP_ALGORITHMS as readonly string[]).includes(resolvedAlgorithm)) {
      throw new Error("Unsupported algorithm.")
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
    })

    const preview = generateTotp(secret, {
      algorithm: resolvedAlgorithm,
      digits: resolvedDigits,
      period: resolvedPeriod,
    })
    return { ok: true as const, data: { ...toMeta(created), preview } }
  } catch (e) {
    return { ok: false as const, message: actionErrorMessage(e, "Could not save this key.") }
  }
}

/** Stateless one-time preview — validates and codes, stores nothing. */
export async function previewTotpCode(input: TotpCreateInput) {
  try {
    const user = await requireActionUser()
    checkRate(`totp:preview:${user.id}`, 300, 60 * 60 * 1000)

    if (typeof input.secret !== "string" || input.secret.trim().length === 0) {
      throw new Error("Secret key is required.")
    }
    if (input.secret.length > 2000) throw new Error("Secret key is too long.")
    let algorithm: TotpAlgorithm | undefined
    if (input.algorithm !== undefined) {
      if (!(TOTP_ALGORITHMS as readonly string[]).includes(input.algorithm as string)) {
        throw new Error("Unsupported algorithm.")
      }
      algorithm = input.algorithm as TotpAlgorithm
    }
    let digits: number | undefined
    if (input.digits !== undefined) {
      const n = Number(input.digits)
      if (!Number.isInteger(n) || n < 6 || n > 8) {
        throw new Error("Code length must be 6, 7 or 8 digits.")
      }
      digits = n
    }
    let period: number | undefined
    if (input.period !== undefined) {
      const n = Number(input.period)
      if (!Number.isInteger(n) || n < 15 || n > 120) {
        throw new Error("Period must be 15 to 120 seconds.")
      }
      period = n
    }

    let label = typeof input.label === "string" ? input.label.trim().slice(0, 80) : ""
    let issuer = typeof input.issuer === "string" ? input.issuer.trim().slice(0, 80) : ""
    let secret = input.secret.trim()
    const resolvedAlgorithm: TotpAlgorithm = algorithm ?? "SHA1"
    const resolvedDigits = digits ?? 6
    const resolvedPeriod = period ?? 30
    let outAlgorithm = resolvedAlgorithm
    let outDigits = resolvedDigits
    let outPeriod = resolvedPeriod

    if (/^otpauth:\/\//i.test(secret)) {
      const parsed = parseOtpauthUri(secret)
      if (!label) label = parsed.label
      if (!issuer) issuer = parsed.issuer
      secret = parsed.secret
      if (algorithm === undefined) outAlgorithm = parsed.algorithm
      if (digits === undefined) outDigits = parsed.digits
      if (period === undefined) outPeriod = parsed.period
    }
    if (!label) label = issuer || "One-time code"

    secret = assertValidSecret(secret)
    if (!(TOTP_ALGORITHMS as readonly string[]).includes(outAlgorithm)) {
      throw new Error("Unsupported algorithm.")
    }

    const { code, secondsRemaining } = generateTotp(secret, {
      algorithm: outAlgorithm,
      digits: outDigits,
      period: outPeriod,
    })
    return {
      ok: true as const,
      data: { code, secondsRemaining, period: outPeriod, digits: outDigits, label, issuer },
    }
  } catch (e) {
    return { ok: false as const, message: actionErrorMessage(e, "Could not generate a code.") }
  }
}

export async function renameTotpKey(id: number, input: { label?: string; issuer?: string }) {
  try {
    const user = await requireActionUser()
    if (!Number.isInteger(id)) throw new Error("Invalid key id.")
    const data: { label?: string; issuer?: string } = {}
    if (input.label !== undefined) {
      if (typeof input.label !== "string" || input.label.length > 80) {
        throw new Error("label must be a string of at most 80 characters.")
      }
      const trimmed = input.label.trim()
      if (!trimmed) throw new Error("Label cannot be empty.")
      data.label = trimmed
    }
    if (input.issuer !== undefined) {
      if (typeof input.issuer !== "string" || input.issuer.length > 80) {
        throw new Error("issuer must be a string of at most 80 characters.")
      }
      data.issuer = input.issuer.trim()
    }
    if (Object.keys(data).length === 0) throw new Error("Nothing to update.")

    const res = await db.totpKey.updateMany({
      where: { id, userId: user.id },
      data,
    })
    if (res.count === 0) throw new Error("Key not found.")
    const row = await db.totpKey.findUnique({ where: { id } })
    if (!row) throw new Error("Key not found.")
    return { ok: true as const, data: toMeta(row) }
  } catch (e) {
    return { ok: false as const, message: actionErrorMessage(e, "Could not rename this key.") }
  }
}

export async function deleteTotpKey(id: number) {
  try {
    const user = await requireActionUser()
    if (!Number.isInteger(id)) throw new Error("Invalid key id.")
    const res = await db.totpKey.deleteMany({ where: { id, userId: user.id } })
    if (res.count === 0) throw new Error("Key not found.")
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, message: actionErrorMessage(e, "Could not delete this key.") }
  }
}
