// Shared admin-cookie token logic. Single source for the signed payload so
// Node (admin-auth.ts) and Edge (proxy.ts) can't drift. Crypto stays
// runtime-specific: Node uses node:crypto, Edge uses WebCrypto.

export const ADMIN_COOKIE_NAME = "admin_session"

export function adminTokenPayload(password: string): string {
  return `admin:${password}`
}

/** Constant-time hex comparison safe for both Node and Edge runtimes. */
export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

import { CONFIG } from "@/lib/config"

/**
 * True only when the public origin is https. Cookie `Secure` (and
 * `SameSite=None`) must follow the URL scheme, NOT NODE_ENV:
 * production on plain http (IP:port) drops `Secure` cookies, which
 * silently breaks signup/login sessions while dev keeps working.
 */
export function publicOriginIsHttps(): boolean {
  const site = CONFIG.NEXT_PUBLIC_SITE_URL || CONFIG.BETTER_AUTH_URL
  return site.trim().toLowerCase().startsWith("https://")
}
