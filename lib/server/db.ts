import { PrismaClient } from "@prisma/client"

// Single Prisma pool shared by all Route Handlers / Server Actions.
// Must be a singleton across HMR in dev to avoid exhausting connections.
const globalForDb = globalThis as unknown as { __accshopPrisma?: PrismaClient }

export const db =
  globalForDb.__accshopPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

if (!globalForDb.__accshopPrisma) globalForDb.__accshopPrisma = db
