import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { PrismaClient } from "@prisma/client"

// Reuse a single PrismaClient across hot-reloads (dev) to avoid exhausting
// connections with a second pool alongside PrismaService.
const globalForAuth = globalThis as unknown as { __authPrisma?: PrismaClient }
const prisma =
  globalForAuth.__authPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
if (!globalForAuth.__authPrisma) globalForAuth.__authPrisma = prisma

export const webOrigins = (process.env.WEB_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)

function normalizedBaseUrl(): string {
  const raw = (process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:4000").replace(/\/+$/, "")
  // Better Auth baseURL must be the origin (no /api/auth suffix) —
  // strip a trailing /api/auth if the env already contains it.
  return raw.replace(/\/api\/auth$/, "")
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL: normalizedBaseUrl(),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
  },
  // All users are treated as verified — no email verification flow.
  // Force emailVerified=true on creation so no "Unverified" state exists.
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: { ...user, emailVerified: true },
        }),
      },
    },
  },
  // Trust the web frontend origin(s) configured via WEB_ORIGINS (defaults to
  // http://localhost:3000). The web runs on :3000 and the API on :4000.
  trustedOrigins: [...new Set([...webOrigins, "http://localhost:3000"])],
  advanced: {
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production" ? true : false,
      httpOnly: true,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
})
