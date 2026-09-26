/**
 * Graph Mail supplier client — fetches Outlook/Hotmail verification codes via
 * POST https://tools.dongvanfb.net/api/graph_code
 * (the same endpoint the supplier's own get_code_mail page uses).
 *
 * Request body:
 *   { email, pass, refresh_token, client_id, type: "all" }
 *
 * Response body:
 *   { email, password, status, code, content, date }
 *   - OTP present:  { status: true, code: "123456", ... }
 *   - No OTP yet:   { status: false, code: "", content: "No code found.", ... }
 *   - Bad tokens:   { status: false, code: "", content: "IMAP connection failed: ...", ... }
 *
 * This replaces the Hotmail143 `hotmail-code` / `outlook-code` lookups for
 * code retrieval. Purchasing / balance / stock still go through Hotmail143.
 */

import { badRequest, fetchWithTimeout, safeJson } from "./upstream"

const DEFAULT_GRAPH_MAIL_URL =
  process.env.GRAPH_MAIL_API_URL ?? "https://tools.dongvanfb.net/api/graph_code"

export function getGraphMailUrl(): string {
  const raw = (process.env.GRAPH_MAIL_API_URL ?? DEFAULT_GRAPH_MAIL_URL).trim()
  return (raw || DEFAULT_GRAPH_MAIL_URL).replace(/\/+$/, "")
}

export interface GraphMailFrom {
  name?: string
  address?: string
}

export interface GraphMailMessage {
  uid?: number
  date?: string
  from?: GraphMailFrom[]
  subject?: string
  code?: string
  message?: string
}

export interface GraphMessagesRaw {
  email?: string
  password?: string
  status?: boolean
  code?: string
  messages?: GraphMailMessage[]
  /** Detail line, e.g. "No code found." or "IMAP connection failed: ...". */
  content?: string
  date?: string
  message?: string
  error?: string
}

export interface GraphMailInput {
  email: string
  password?: string
  refresh_token: string
  client_id: string
  /** Mail-type filter, comma-joined ("all" default — mirrors the supplier page). */
  type?: string
}

export interface GraphCodeResult {
  successful: boolean
  code: number
  msg: string
  timestamp?: number
  data: {
    code: string | null
    email?: string
    messages?: GraphMailMessage[]
    latest?: GraphMailMessage | null
    retryAfter?: number
    shouldRetry?: boolean
  } | null
}

/** Raw call — returns the upstream payload untouched (plus code normalization). */
export async function getGraphMessages(input: GraphMailInput): Promise<GraphMessagesRaw> {
  const email = input.email.trim()
  const refresh_token = input.refresh_token.trim()
  const client_id = input.client_id.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) badRequest("Enter a valid email address.")
  if (!refresh_token) badRequest("Missing refresh_token — paste the full email|password|refresh_token|client_id line.")
  if (!client_id) badRequest("Missing client_id — paste the full email|password|refresh_token|client_id line.")

  const url = getGraphMailUrl()
  const res = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        pass: input.password ?? "",
        refresh_token,
        client_id,
        type: input.type ?? "all",
      }),
    },
    30000,
    "GraphMail",
  )
  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    badRequest(
      `GraphMail request failed (${res.status}${detail ? `: ${detail.slice(0, 300)}` : ""}).`,
    )
  }
  const raw = (await safeJson(res, "GraphMail")) as GraphMessagesRaw
  if (raw && raw.status === false && !/^\d{4,8}$/.test((raw.code ?? "").trim())) {
    const detail = (raw.content ?? raw.message ?? raw.error ?? "").trim()
    // Credential-level failures (dead tokens) vs. "no OTP yet".
    if (/imap connection failed|invalid|expired|unauthori[sz]ed|forbidden|empty access token|bad token/i.test(detail)) {
      badRequest(
        detail
          ? `GraphMail rejected the credentials (${detail})`
          : "GraphMail rejected the credentials — the refresh_token or client_id may be expired.",
      )
    }
  }
  return raw ?? {}
}

/**
 * Normalized code lookup — same envelope shape as the old Hotmail lookup so
 * the dashboard retry UX (`shouldRetry` + `retryAfter`) keeps working.
 * The graph_code endpoint returns a single top-level `code` (no message
 * list), so there is nothing to scan — a filled code is the answer,
 * anything else is "no OTP yet".
 */
export async function getGraphCode(input: GraphMailInput): Promise<GraphCodeResult> {
  const raw = await getGraphMessages(input)
  const code = (raw.code ?? "").trim()

  if (/^\d{4,8}$/.test(code)) {
    return {
      successful: true,
      code: 0,
      msg: "Code retrieved.",
      timestamp: Date.now(),
      data: {
        code,
        email: raw.email ?? input.email,
        messages: [],
        latest: null,
      },
    }
  }
  const detail = (raw.content ?? "").trim()
  return {
    successful: false,
    code: -2,
    msg: detail || "No code in the mailbox yet — trigger a new OTP, then retry.",
    timestamp: Date.now(),
    data: {
      code: null,
      email: raw.email ?? input.email,
      messages: [],
      latest: null,
      shouldRetry: true,
      retryAfter: 10,
    },
  }
}

/**
 * Parse a pasted credentials line. Accepts:
 *   email|password|refresh_token|client_id (preferred)
 *   email|refresh_token|client_id (password optional for the Graph API)
 */
export function parseGraphLine(line: string): GraphMailInput {
  const parts = line
    .split("|")
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
  const email = parts[0] ?? ""
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    badRequest("Enter a valid email address or credentials line.")
  }
  if (parts.length < 3) {
    badRequest(
      "This mailbox needs its credentials line (email|password|refresh_token|client_id). Email alone is only supported for orders saved with refresh_token + client_id.",
    )
  }
  if (parts.length === 3) {
    // email|refresh_token|client_id
    return { email: parts[0], refresh_token: parts[1], client_id: parts[2], type: "all" }
  }
  // Full 4-part line (extra segments ignored).
  return {
    email: parts[0],
    password: parts[1],
    refresh_token: parts[2],
    client_id: parts[3],
    type: "all",
  }
}
