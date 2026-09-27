"use server"

import { cookies, headers } from "next/headers"

import { auth } from "@/lib/server/auth"
import { getOrCreateWallet } from "@/lib/server/wallet"

/** Copy Set-Cookie headers from a better-auth Response onto the browser. */
async function forwardAuthCookies(res: Response) {
  const store = await cookies()
  const headersList = res.headers as Headers & { getSetCookie?: () => string[] }
  let setCookies: string[] = []
  if (typeof headersList.getSetCookie === "function") {
    setCookies = headersList.getSetCookie()
  } else {
    const combined = headersList.get("set-cookie")
    if (combined) setCookies = [combined]
  }
  for (const sc of setCookies) {
    const parts = sc.split(";").map((s) => s.trim())
    const [pair, ...attrs] = parts
    if (!pair) continue
    const eq = pair.indexOf("=")
    if (eq === -1) continue
    const name = pair.slice(0, eq).trim()
    if (!name) continue
    const value = pair.slice(eq + 1)
    const options: {
      path: string
      httpOnly?: boolean
      secure?: boolean
      sameSite?: "lax" | "strict" | "none"
      maxAge?: number
      expires?: Date
    } = { path: "/" }
    for (const attr of attrs) {
      const [k, v] = attr.split("=")
      const key = k.toLowerCase()
      if (key === "httponly") options.httpOnly = true
      else if (key === "secure") options.secure = true
      else if (key === "samesite") options.sameSite = (v?.toLowerCase() ?? "lax") as "lax"
      else if (key === "max-age") {
        const n = Number(v)
        if (Number.isFinite(n)) options.maxAge = n
      } else if (key === "expires") {
        const d = new Date(v)
        if (!Number.isNaN(d.getTime())) options.expires = d
      } else if (key === "path") options.path = v || "/"
    }
    store.set(name, decodeURIComponent(value), options)
  }
}

function authErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof Response) return fallback
  if (e && typeof e === "object" && "body" in e) {
    try {
      const body = (e as { body?: unknown }).body as { message?: unknown } | null
      if (body && typeof body.message === "string" && body.message) return body.message
    } catch {
      /* ignore */
    }
  }
  if (e instanceof Error && e.message) {
    // better-auth APIError carries .body.message; fall back to .message.
    const body = (e as { body?: { message?: unknown } }).body
    if (body && typeof body.message === "string" && body.message) return body.message
    return e.message
  }
  return fallback
}

/** Current session user (or null) — replaces authClient.useSession(). */
export async function getSessionUser() {
  try {
    const headerStore = await headers()
    const session = await auth.api.getSession({ headers: headerStore })
    if (!session?.user) return null
    return {
      id: session.user.id as string,
      name: session.user.name as string,
      email: session.user.email as string,
    }
  } catch {
    return null
  }
}

/** Email + password sign-up. Creates the user, signs in, seeds the wallet. */
export async function signUpAction(input: { email: string; password: string; name: string }) {
  const email = input.email.trim().toLowerCase()
  const password = input.password
  const name = input.name.trim() || email.split("@")[0]
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false as const, message: "Enter a valid email address." }
  }
  if (typeof password !== "string" || password.length < 8) {
    return { ok: false as const, message: "Password must be at least 8 characters." }
  }
  try {
    const res = await auth.api.signUpEmail({
      body: { email, password, name },
      headers: await headers(),
      asResponse: true,
    })
    if (!res.ok) {
      let message = "Could not create your account."
      try {
        const body = (await res.json()) as { message?: string }
        message = body?.message ?? message
      } catch {
        /* ignore */
      }
      return { ok: false as const, message }
    }
    await forwardAuthCookies(res)
    try {
      const session = await auth.api.getSession({ headers: await headers() })
      const userId = session?.user?.id as string | undefined
      if (userId) await getOrCreateWallet(userId)
    } catch {
      /* wallet seeding is best-effort here; dashboard also ensures it */
    }
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, message: authErrorMessage(e, "Could not create your account.") }
  }
}

/** Email + password sign-in. */
export async function signInAction(input: { email: string; password: string }) {
  const email = input.email.trim().toLowerCase()
  const password = input.password
  if (!email || !password) {
    return { ok: false as const, message: "Enter your email and password." }
  }
  try {
    const res = await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
      asResponse: true,
    })
    if (!res.ok) {
      let message = "Invalid email or password."
      try {
        const body = (await res.json()) as { message?: string }
        message = body?.message ?? message
      } catch {
        /* ignore */
      }
      return { ok: false as const, message }
    }
    await forwardAuthCookies(res)
    try {
      const session = await auth.api.getSession({ headers: await headers() })
      const userId = session?.user?.id as string | undefined
      if (userId) await getOrCreateWallet(userId)
    } catch {
      /* ignore */
    }
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, message: authErrorMessage(e, "Invalid email or password.") }
  }
}

/** Sign out the current session. */
export async function signOutAction() {
  try {
    const res = await auth.api.signOut({
      headers: await headers(),
      asResponse: true,
    })
    await forwardAuthCookies(res)
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, message: authErrorMessage(e, "Could not sign out.") }
  }
}
