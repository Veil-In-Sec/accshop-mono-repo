import { BadRequestException } from "@nestjs/common"
import { createHmac } from "crypto"

/**
 * Pure RFC 6238 TOTP helpers (no Nest dependencies).
 * Server-side generation keeps the raw secrets in the encrypted vault —
 * clients only ever receive short-lived codes, never the secret itself.
 */

export const TOTP_ALGORITHMS = ["SHA1", "SHA256", "SHA512"] as const
export type TotpAlgorithm = (typeof TOTP_ALGORITHMS)[number]

const NODE_ALGO: Record<TotpAlgorithm, string> = {
  SHA1: "sha1",
  SHA256: "sha256",
  SHA512: "sha512",
}

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

/** Uppercase + strip spaces/hyphens so pasted keys are forgiving. */
export function normalizeSecret(input: string): string {
  return (input ?? "").toUpperCase().replace(/[\s-]+/g, "")
}

/** Throws a user-friendly 400 when the secret is not usable Base32. */
export function assertValidSecret(input: string): string {
  const clean = normalizeSecret(input).replace(/=+$/, "")
  if (clean.length < 16) {
    throw new BadRequestException(
      "Secret key is too short — paste the full Base32 setup key (at least 16 characters).",
    )
  }
  if (!/^[A-Z2-7]+$/.test(clean)) {
    throw new BadRequestException(
      "Secret key is not valid Base32 — use characters A–Z and 2–7 only.",
    )
  }
  const remainder = clean.length % 8
  if (remainder === 1 || remainder === 3 || remainder === 6) {
    throw new BadRequestException("Secret key is not valid Base32 (bad length).")
  }
  return clean
}

export function base32Decode(input: string): Buffer {
  const clean = assertValidSecret(input)
  const out: number[] = []
  let bits = 0
  let value = 0
  for (const ch of clean) {
    value = (value << 5) | BASE32_ALPHABET.indexOf(ch)
    bits += 5
    if (bits >= 8) {
      bits -= 8
      out.push((value >>> bits) & 0xff)
    }
  }
  return Buffer.from(out)
}

export interface TotpOptions {
  algorithm?: TotpAlgorithm
  digits?: number
  period?: number
}

/** Current TOTP code + seconds until it rolls over (RFC 6238). */
export function generateTotp(
  secretBase32: string,
  opts: TotpOptions = {},
  atMs = Date.now(),
): { code: string; secondsRemaining: number } {
  const algorithm = opts.algorithm ?? "SHA1"
  const digits = opts.digits ?? 6
  const period = opts.period ?? 30

  const key = base32Decode(secretBase32)
  const counter = Math.floor(Math.floor(atMs / 1000) / period)
  const msg = Buffer.alloc(8)
  msg.writeBigUInt64BE(BigInt(counter))

  const hmac = createHmac(NODE_ALGO[algorithm], key).update(msg).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3]
  const code = binary % 10 ** digits
  const secondsRemaining = period - (Math.floor(atMs / 1000) % period)
  return { code: String(code).padStart(digits, "0"), secondsRemaining }
}

export interface ParsedOtpauthUri {
  label: string
  issuer: string
  secret: string
  algorithm: TotpAlgorithm
  digits: number
  period: number
}

/** Parses otpauth:// URIs from scanned setup QR codes (TOTP only). */
export function parseOtpauthUri(uri: string): ParsedOtpauthUri {
  const trimmed = (uri ?? "").trim()
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new BadRequestException("This QR code is not a valid 2FA setup code.")
  }
  if (url.protocol !== "otpauth:") {
    throw new BadRequestException("This QR code is not a 2FA setup code.")
  }
  if (url.hostname.toLowerCase() !== "totp") {
    throw new BadRequestException(
      "Only time-based (TOTP) codes are supported — counter-based (HOTP) codes are not supported.",
    )
  }

  const rawSecret = url.searchParams.get("secret") ?? ""
  const secret = assertValidSecret(rawSecret)

  // Label is "/issuer:account" or "/account"; explicit ?issuer= wins.
  const rawLabel = decodeURIComponent(url.pathname.replace(/^\//, ""))
  let label = rawLabel
  let issuer = (url.searchParams.get("issuer") ?? "").trim()
  if (rawLabel.includes(":")) {
    const [first, ...rest] = rawLabel.split(":")
    if (!issuer) issuer = first.trim()
    label = rest.join(":").trim()
  }

  const algorithm = (url.searchParams.get("algorithm") ?? "SHA1").toUpperCase()
  if (!(TOTP_ALGORITHMS as readonly string[]).includes(algorithm)) {
    throw new BadRequestException("Unsupported algorithm — use SHA1, SHA256 or SHA512.")
  }
  const digits = Number(url.searchParams.get("digits") ?? 6)
  if (!Number.isInteger(digits) || digits < 6 || digits > 8) {
    throw new BadRequestException("Unsupported code length — use 6, 7 or 8 digits.")
  }
  const period = Number(url.searchParams.get("period") ?? 30)
  if (!Number.isInteger(period) || period < 15 || period > 120) {
    throw new BadRequestException("Unsupported period — use 15 to 120 seconds.")
  }

  return {
    label: label.trim(),
    issuer: issuer.trim(),
    secret,
    algorithm: algorithm as TotpAlgorithm,
    digits,
    period,
  }
}
