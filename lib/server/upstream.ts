import { Prisma } from "@prisma/client"

import { jsonError } from "./auth"
import { prismaError } from "./http"

/**
 * Shared server-lib plumbing (mirrors apps/api/src/common/upstream-http.ts).
 * Supplier failures surface as HttpError(400) — the equivalent of Nest's
 * BadRequestException — so Route Handlers can map them with routeError().
 */

/** 4xx-style error thrown by server libs (mirrors Nest BadRequestException). */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = "HttpError"
  }
}

/** Throw an HttpError(400). Mirrors `throw new BadRequestException(msg)`. */
export function badRequest(message: string): never {
  throw new HttpError(400, message)
}

/** Map a caught error to a Route Handler response. Falls back to 500. */
export function routeError(e: unknown): Response {
  if (e instanceof Response) return e
  if (e instanceof HttpError) return jsonError(e.status, e.message)
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = prismaError(e)
    if (mapped) return mapped
  }
  console.error(e)
  return jsonError(500, "Something went wrong.")
}

export async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  ms = 20000,
  serviceName = "Supplier",
): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } catch (e) {
    if ((e as Error)?.name === "AbortError") {
      badRequest(`${serviceName} request timed out — try again.`)
    }
    throw e
  } finally {
    clearTimeout(t)
  }
}

export async function safeJson(res: Response, serviceName = "Supplier"): Promise<any> {
  try {
    return await res.json()
  } catch {
    badRequest(`${serviceName} returned a non-JSON response (${res.status}).`)
  }
}

export async function parseUpstreamError(res: Response, fallback: string): Promise<never> {
  let detail = fallback
  try {
    const body = (await res.json()) as {
      message?: string
      error?: string
      msg?: string
      status?: string
      errors?: Record<string, string[]>
    }
    detail = body.error ?? body.message ?? body.msg ?? detail
    const fieldErrors = body.errors
      ? ` (${Object.entries(body.errors)
          .map(([k, v]) => `${k}: ${v.join(", ")}`)
          .join("; ")})`
      : ""
    if (fieldErrors && fieldErrors !== " ()") detail += fieldErrors
  } catch {
    /* keep fallback */
  }
  throw new HttpError(400, `${fallback} (${res.status}${detail ? `: ${detail}` : ""}).`)
}
