import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"

import { HttpError, badRequest } from "./upstream"

const PREFIX = "v1"

/**
 * AES-256-GCM vault for customer TOTP secrets.
 * Port of apps/api/src/totp/vault.service.ts (TotpVaultService as module
 * functions; the key is resolved once and cached at module scope).
 * Key resolution: dedicated TOTP_VAULT_KEY (64 hex chars) preferred.
 * Falls back to a domain-separated SHA-256 of BETTER_AUTH_SECRET so dev
 * keeps working — but rotating BETTER_AUTH_SECRET then invalidates the
 * vault, so production MUST set TOTP_VAULT_KEY and never rotate it
 * without re-encrypting.
 */

let cachedKey: Buffer | null = null

function resolveVaultKey(): Buffer {
  if (cachedKey) return cachedKey
  const hex = process.env.TOTP_VAULT_KEY?.trim()
  if (hex && /^[0-9a-fA-F]{64}$/.test(hex)) {
    cachedKey = Buffer.from(hex, "hex")
    return cachedKey
  }
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) {
    throw new HttpError(500, "TOTP vault is not configured.")
  }
  if (process.env.NODE_ENV === "production") {
    // eslint-disable-next-line no-console
    console.warn("[totp] TOTP_VAULT_KEY not set — derived vault key in use. Set a dedicated key.")
  }
  cachedKey = createHash("sha256").update(`totp-vault:${secret}`).digest()
  return cachedKey
}

/** Encrypts a normalized secret → "v1.<iv>.<tag>.<ciphertext>" (base64). */
export function encryptTotpSecret(plaintext: string): string {
  const key = resolveVaultKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  return [PREFIX, iv.toString("base64"), cipher.getAuthTag().toString("base64"), ct.toString("base64")].join(".")
}

export function decryptTotpSecret(payload: string): string {
  const key = resolveVaultKey()
  try {
    const [prefix, ivB64, tagB64, ctB64] = (payload ?? "").split(".")
    if (prefix !== PREFIX || !ivB64 || !tagB64 || !ctB64) throw new Error("bad envelope")
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"))
    decipher.setAuthTag(Buffer.from(tagB64, "base64"))
    return Buffer.concat([
      decipher.update(Buffer.from(ctB64, "base64")),
      decipher.final(),
    ]).toString("utf8")
  } catch {
    badRequest(
      "Could not decrypt this key — the vault key may have changed. Delete the key and add it again.",
    )
  }
}
