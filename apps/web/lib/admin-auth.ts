import { createHmac, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"

const COOKIE_NAME = "admin_session"

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
  return createHmac("sha256", secret).update(`admin:${password}`).digest("hex")
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
  store.set(COOKIE_NAME, signToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  })
}

export async function clearAdminSession() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export async function isAdminAuthenticated() {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
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
