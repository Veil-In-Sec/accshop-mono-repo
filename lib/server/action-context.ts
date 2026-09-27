// Server-Action auth context — replaces Request-based requireUser/requireAdmin.
// Works directly in Server Actions via next/headers (no fetch, no /api/*).

import { headers } from "next/headers"

import { isAdminAuthenticated } from "@/lib/admin-auth"
import { auth, type SessionUser } from "@/lib/server/auth"

/** Resolve the signed-in customer inside a Server Action. Null when anonymous. */
export async function getActionUser(): Promise<SessionUser | null> {
  try {
    const headerStore = await headers()
    const session = await auth.api.getSession({ headers: headerStore })
    return (session?.user as SessionUser | undefined) ?? null
  } catch {
    return null
  }
}

/** Throw when no customer session exists (maps old 401 responses). */
export async function requireActionUser(): Promise<SessionUser> {
  const user = await getActionUser()
  if (!user) throw new Error("Unauthorized")
  return user
}

/** True when the caller carries a valid admin_session cookie. */
export async function isActionAdmin(): Promise<boolean> {
  return isAdminAuthenticated()
}

/** Throw when the caller is not an admin (maps old 401 responses). */
export async function requireActionAdmin(): Promise<void> {
  const ok = await isAdminAuthenticated()
  if (!ok) throw new Error("Unauthorized")
}

/**
 * Map server-lib errors (HttpError with .status, better-auth Responses) to
 * plain Error messages so Server Actions return the same user-facing text
 * the old API routes sent as `{ message }` JSON.
 */
export function actionErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof Response) return fallback
  if (e && typeof e === "object" && "status" in e && "message" in e) {
    const m = (e as { message?: unknown }).message
    if (typeof m === "string" && m) return m
  }
  if (e instanceof Error && e.message) return e.message
  return fallback
}
