/**
 * Graph Mail supplier client — fetches Outlook/Hotmail verification codes via
 * POST https://tools.dongvanfb.net/api/graph_messages
 *
 * Request body:
 *   { email, refresh_token, client_id, list_mail?: "all" }
 *
 * Response body:
 *   {
 *     email, password, status: true, code: "",
 *     messages: [{ uid, date, from: [{ name, address }], subject, code, message }]
 *   }
 *
 * This replaces the Hotmail143 `hotmail-code` / `outlook-code` lookups for
 * code retrieval. Purchasing / balance / stock still go through Hotmail143.
 */

import { badRequest, fetchWithTimeout, safeJson } from "./upstream"

const DEFAULT_GRAPH_MAIL_URL =
  process.env.GRAPH_MAIL_API_URL ?? "https://tools.dongvanfb.net/api/graph_messages"

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
}

export interface GraphMailInput {
  email: string
  refresh_token: string
  client_id: string
  list_mail?: string
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

function extractCodeFromText(text: string): string | null {
  if (!text) return null
  // Common OTP shapes: 4-8 digit codes, optionally spaced/dashed.
  const patterns = [
    /(?:code|mã|otp|verification)[^\d]{0,40}(\d[\d\s-]{3,9}\d)/i,
    /\b(\d{6})\b/,
    /\b(\d{5})\b/,
    /\b(\d{4})\b/,
    /\b(\d{7,8})\b/,
  ]
  for (const re of patterns) {
    const m = text.match(re)
    if (m?.[1]) {
      const digits = m[1].replace(/[\s-]+/g, "")
      if (/^\d{4,8}$/.test(digits)) return digits
    }
  }
  return null
}

/** Pick the newest message that carries a code (upstream `code` or regex fallback). */
function pickCode(
  messages: GraphMailMessage[],
  topLevelCode?: string,
): { code: string | null; latest: GraphMailMessage | null } {
  const cleanTop = (topLevelCode ?? "").trim()
  if (/^\d{4,8}$/.test(cleanTop)) {
    const withCode = messages.find((m) => (m.code ?? "").trim() === cleanTop) ?? messages[0] ?? null
    return { code: cleanTop, latest: withCode }
  }
  for (const m of messages) {
    const c = (m.code ?? "").trim()
    if (/^\d{4,8}$/.test(c)) return { code: c, latest: m }
  }
  for (const m of messages) {
    const fallback = extractCodeFromText(`${m.subject ?? ""}\n${m.message ?? ""}`)
    if (fallback) return { code: fallback, latest: m }
  }
  return { code: null, latest: messages[0] ?? null }
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
        refresh_token,
        client_id,
        list_mail: input.list_mail ?? "all",
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
  if (raw && raw.status === false) {
    badRequest("GraphMail rejected the credentials — the refresh_token or client_id may be expired.")
  }
  return raw ?? {}
}

/**
 * Normalized code lookup — same envelope shape as the old Hotmail lookup so
 * the dashboard retry UX (`shouldRetry` + `retryAfter`) keeps working.
 */
export async function getGraphCode(input: GraphMailInput): Promise<GraphCodeResult> {
  const raw = await getGraphMessages(input)
  const messages = Array.isArray(raw.messages) ? raw.messages : []
  const { code, latest } = pickCode(messages, raw.code)

  if (code) {
    return {
      successful: true,
      code: 0,
      msg: "Code retrieved.",
      timestamp: Date.now(),
      data: {
        code,
        email: raw.email ?? input.email,
        messages,
        latest,
      },
    }
  }
  return {
    successful: false,
    code: -2,
    msg:
      messages.length === 0
        ? "No messages yet — trigger the code on the source site, then retry."
        : "No code in the latest messages yet — trigger a new OTP, then retry.",
    timestamp: Date.now(),
    data: {
      code: null,
      email: raw.email ?? input.email,
      messages,
      latest,
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
    return { email: parts[0], refresh_token: parts[1], client_id: parts[2], list_mail: "all" }
  }
  // Full 4-part line (extra segments ignored).
  return {
    email: parts[0],
    refresh_token: parts[2],
    client_id: parts[3],
    list_mail: "all",
  }
}
