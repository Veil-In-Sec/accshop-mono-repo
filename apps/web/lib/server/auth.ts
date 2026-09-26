import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"

import { publicOriginIsHttps } from "@/lib/admin-token"

import { db } from "./db"

export function normalizedBaseUrl(): string {
  // In the merged app auth lives on the same origin: /api/auth.
  // better-auth baseURL must be the origin without the /api/auth suffix.
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000"
  return site.replace(/\/+$/, "").replace(/\/api\/auth$/, "")
}

const webOrigins = (process.env.WEB_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  baseURL: normalizedBaseUrl(),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: { ...user, emailVerified: true },
        }),
      },
    },
  },
  trustedOrigins: [...new Set([...webOrigins, normalizedBaseUrl(), "http://localhost:3000"])],
  advanced: {
    defaultCookieAttributes: {
      sameSite: publicOriginIsHttps() ? "none" : "lax",
      secure: publicOriginIsHttps(),
      httpOnly: true,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
})

export interface SessionUser {
  id: string
  name: string
  email: string
  emailVerified?: boolean
  image?: string | null
}

/** Resolve the signed-in customer from request cookies. Null when anonymous. */
export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  try {
    const session = await auth.api.getSession({ headers: req.headers })
    return (session?.user as SessionUser | undefined) ?? null
  } catch {
    return null
  }
}

/** Throw a 401 Response when no customer session exists. */
export async function requireUser(req: Request): Promise<SessionUser> {
  const user = await getSessionUser(req)
  if (!user) throw jsonError(401, "Unauthorized")
  return user
}

export function jsonError(status: number, message: string, extra?: Record<string, unknown>) {
  return Response.json({ statusCode: status, message, ...extra }, { status })
}
