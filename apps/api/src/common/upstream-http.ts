import { BadRequestException } from "@nestjs/common"

/**
 * Shared upstream HTTP plumbing for supplier integrations (Hotmail143,
 * BulkMail). One implementation — services keep thin private wrappers so
 * their call sites stay untouched.
 */

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
      throw new BadRequestException(`${serviceName} request timed out — try again.`)
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
    throw new BadRequestException(`${serviceName} returned a non-JSON response (${res.status}).`)
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
  throw new BadRequestException(`${fallback} (${res.status}${detail ? `: ${detail}` : ""}).`)
}
