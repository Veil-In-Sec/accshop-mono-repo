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
 * Server-only base URL for the merged Next.js API (same app, app/api/*).
 * Never import this from client components — the client must use
 * same-origin /api/* directly.
 *
 * The server listens on process.env.PORT (server.js / cPanel / PM2 assign
 * it dynamically), so prefer it over a possibly stale API_SERVER_URL port
 * (dev runs on :3002, prod hosts often assign a different port).
 */
export function apiBaseUrl() {
  if (typeof window !== "undefined") {
    throw new Error("apiBaseUrl() is server-only — use same-origin /api/* on the client.")
  }
  // ACTUAL_PORT is stamped by server.js once listen() succeeds — it is the
  // port THIS process really bound (correct even after EADDRINUSE retries or
  // dynamic host assignment). PORT alone can lie when a stale process holds
  // the desired port.
  const port = process.env.ACTUAL_PORT?.trim() || process.env.PORT?.trim()
  if (port) return `http://127.0.0.1:${port}`
  return (
    process.env.API_SERVER_URL ??
    process.env.API_URL ??
    "http://127.0.0.1:3000"
  )
}

export function apiUrl(path: string) {
  const base = apiBaseUrl()
  const clean = path.startsWith("/") ? path : `/${path}`
  return `${base}/api${clean}`
}
