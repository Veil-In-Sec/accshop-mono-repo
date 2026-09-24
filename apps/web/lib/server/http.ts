import { Prisma } from "@prisma/client"

import { jsonError } from "@/lib/server/auth"

/** Map Prisma known errors to HTTP responses. Returns null when not handled. */
export function prismaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") return jsonError(404, "Not found.")
    if (error.code === "P2002") return jsonError(409, "Already exists.")
  }
  return null
}

export function isPrismaNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025"
}

/** Read JSON body, returning {} for empty bodies. Throws 400 on invalid JSON. */
export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    const text = await req.text()
    if (!text) return {} as T
    return JSON.parse(text) as T
  } catch {
    throw jsonError(400, "Invalid JSON body.")
  }
}
