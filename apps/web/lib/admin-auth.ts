import { createHmac, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"

import { ADMIN_COOKIE_NAME, adminTokenPayload, publicOriginIsHttps } from "@/lib/admin-token"

function getSecret() {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set")
  return secret
}

function signToken() {
  const secret = getSecret()
  const password = process.env.ADMIN_PASSWORD
  // Fail closed: no password configured must never produce a usable token.
  if (!password) throw new Error("ADMIN_PASSWORD is not set")
  return createHmac("sha256", secret).update(adminTokenPayload(password)).digest("hex")
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8")
  const bb = Buffer.from(b, "utf8")
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

export async function verifyAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  return safeEqual(password, expected)
}

export async function createAdminSession() {
  const store = await cookies()
  store.set(ADMIN_COOKIE_NAME, signToken(), {
    httpOnly: true,
    secure: publicOriginIsHttps(),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  })
}

export async function clearAdminSession() {
  const store = await cookies()
  store.delete(ADMIN_COOKIE_NAME)
}

export async function isAdminAuthenticated() {
  const store = await cookies()
  const token = store.get(ADMIN_COOKIE_NAME)?.value
  if (!token) return false
  try {
    return safeEqual(token, signToken())
  } catch {
    // Fail closed when secrets are missing.
    return false
  }
}

export async function requireAdmin() {
  const ok = await isAdminAuthenticated()
  if (!ok) throw new Error("Unauthorized")
}
