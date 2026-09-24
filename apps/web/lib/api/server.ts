import { ApiError, apiUrl } from "./http"

/**
 * Server-side fetch to the merged Next.js API (same app, app/api/*).
 * Forwards the incoming request cookies (user session + admin session)
 * so guarded endpoints authenticate correctly.
 */
async function buildHeaders(init: RequestInit, forwardCookies: boolean): Promise<HeadersInit> {
  let cookieHeader = ""
  if (forwardCookies) {
    const { cookies } = await import("next/headers")
    const store = await cookies()
    cookieHeader = store.toString()
  }
  return {
    "Content-Type": "application/json",
    ...(init.headers ?? {}),
    ...(cookieHeader ? { cookie: cookieHeader } : {}),
  }
}

async function throwApiError(res: Response): Promise<never> {
  let message = res.statusText
  let body: unknown
  try {
    body = await res.json()
    message = (body as { message?: string })?.message ?? message
  } catch {
    /* ignore non-JSON error bodies */
  }
  throw new ApiError(res.status, message, body)
}

async function fetchApi<T>(
  path: string,
  init: RequestInit = {},
  forwardCookies: boolean,
): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: await buildHeaders(init, forwardCookies),
    cache: "no-store",
  })

  if (!res.ok) await throwApiError(res)

  return (await res.json()) as T
}

export async function serverFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  return fetchApi<T>(path, init, true)
}

/**
 * Public fetch that doesn't forward cookies - for public endpoints.
 */
export async function publicFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  return fetchApi<T>(path, init, false)
}

/** Like serverFetch but returns the raw Response (e.g. to inspect Set-Cookie). */
export async function serverFetchResponse(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(apiUrl(path), {
    ...init,
    headers: await buildHeaders(init, true),
    cache: "no-store",
  })
}

/**
 * Copy Set-Cookie headers from an API response onto the browser so auth
 * cookies (admin session, etc.) are persisted for the web client.
 */
export async function forwardSetCookies(res: Response) {
  const { cookies } = await import("next/headers")
  const store = await cookies()
  const headers = res.headers as Headers & { getSetCookie?: () => string[] }
  let setCookies: string[] = []
  if (typeof headers.getSetCookie === "function") {
    setCookies = headers.getSetCookie()
  } else {
    const combined = headers.get("set-cookie")
    if (combined) setCookies = combined.split(/,(?=[^;,]+=[^;,]*;)/)
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
      domain?: string
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
      else if (key === "domain") options.domain = v
    }

    store.set(name, value, options)
  }
}

export { ApiError }
