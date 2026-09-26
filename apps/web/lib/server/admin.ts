import { createHmac, timingSafeEqual } from "crypto"

import { cookies } from "next/headers"

import { CONFIG } from "@/lib/config"

import { jsonError } from "./auth"

export const ADMIN_COOKIE_NAME = "admin_session"

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8")
  const bb = Buffer.from(b, "utf8")
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

export function signAdminToken(): string {
  const secret = CONFIG.BETTER_AUTH_SECRET
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set")
  const password = CONFIG.ADMIN_PASSWORD ?? ""
  return createHmac("sha256", secret).update(`admin:${password}`).digest("hex")
}

export function verifyAdminPassword(password: string): boolean {
  const expected = CONFIG.ADMIN_PASSWORD
  if (!expected) return false
  return safeEqual(password, expected)
}

/** True when the request carries a valid admin_session cookie. */
export async function isAdminRequest(req: Request): Promise<boolean> {
  let token: string
  try {
    token = signAdminToken()
  } catch {
    return false
  }
  const cookieHeader = req.headers.get("cookie") ?? ""
  const presented = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${ADMIN_COOKIE_NAME}=`))
    ?.slice(ADMIN_COOKIE_NAME.length + 1)
  // Fall back to Next cookies() when called from Server Actions/layouts.
  let value = presented
  if (!value) {
    try {
      value = (await cookies()).get(ADMIN_COOKIE_NAME)?.value
    } catch {
      value = undefined
    }
  }
  return typeof value === "string" && safeEqual(value, token)
}

/** Throw a 401 Response when the caller is not an admin. */
export async function requireAdmin(req: Request): Promise<void> {
  if (!(await isAdminRequest(req))) throw jsonError(401, "Unauthorized")
}
