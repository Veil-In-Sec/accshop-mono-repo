import { NextResponse, type NextRequest } from "next/server"

const COOKIE_NAME = "admin_session"

async function expectedToken() {
  const secret = process.env.BETTER_AUTH_SECRET
  const password = process.env.ADMIN_PASSWORD
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
    new TextEncoder().encode(`admin:${password}`),
  )
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = await expectedToken()
  const presented = request.cookies.get(COOKIE_NAME)?.value
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
