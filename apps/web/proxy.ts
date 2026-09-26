import { NextResponse, type NextRequest } from "next/server"

import { CONFIG } from "@/lib/config"
import { ADMIN_COOKIE_NAME, adminTokenPayload, safeEqualHex } from "@/lib/admin-token"

async function expectedToken() {
  const secret = CONFIG.BETTER_AUTH_SECRET
  const password = CONFIG.ADMIN_PASSWORD
  // Fail closed: missing secrets must never authenticate.
  if (!secret || !password) return null
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(adminTokenPayload(password)),
  )
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = await expectedToken()
  const presented = request.cookies.get(ADMIN_COOKIE_NAME)?.value
  const authed = Boolean(token && presented && safeEqualHex(presented, token!))

  if (pathname === "/admin/login") {
    if (authed) {
      return NextResponse.redirect(new URL("/admin", request.url))
    }
    return NextResponse.next()
  }

  if (!authed) {
    return NextResponse.redirect(new URL("/admin/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
}
