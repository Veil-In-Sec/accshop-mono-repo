export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.body = body
  }
}

/**
 * Server-only base URL for the NestJS API. Never import this from client
 * components — the client must use same-origin /api/* (rewrites proxy).
 */
export function apiBaseUrl() {
  if (typeof window !== "undefined") {
    throw new Error("apiBaseUrl() is server-only — use same-origin /api/* on the client.")
  }
  return (
    process.env.API_SERVER_URL ??
    process.env.API_URL ??
    "http://127.0.0.1:4000"
  )
}

export function apiUrl(path: string) {
  const base = apiBaseUrl()
  const clean = path.startsWith("/") ? path : `/${path}`
  return `${base}/api${clean}`
}
