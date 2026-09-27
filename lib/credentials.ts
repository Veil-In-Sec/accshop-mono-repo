export interface CredentialAccount {
  email: string
  password: string
  refresh_token?: string
  client_id?: string
}

/** Single-line pipe format shared by delivery display and Get Code input. */
export const PIPE_FORMAT_HINT = "email|password|refresh_token|client_id"

/**
 * Repairs accounts mangled by the old BulkMail colon-split
 * ("user@gmail.com---https" + "//api.mailgen.shop/..." split on the
 * ":" inside "https://"). Stored JSON keeps that shape, so heal on read:
 * "email---https" / "//..." -> "email" / "https://...".
 */
export function normalizeAccount(acc: CredentialAccount): CredentialAccount {
  const email = (acc.email ?? "").trim()
  const password = (acc.password ?? "").trim()
  const dashIdx = email.indexOf("---")
  if (dashIdx > 0) {
    const realEmail = email.slice(0, dashIdx).trim()
    let suffix = email.slice(dashIdx + 3).trim()
    // Suffix is the protocol fragment lost at the old split ("https").
    let realPassword = password
    if (suffix && password.startsWith("//")) {
      realPassword = `${suffix}:${password}`
    } else if (suffix) {
      realPassword = suffix + password
    }
    if (realEmail && realPassword) {
      return { ...acc, email: realEmail, password: realPassword.trim() }
    }
  }
  // Second mangled shape: email kept the trailing protocol ("...---https"
  // was trimmed differently). Heal the same way when password is URL-tail.
  if (/^https?$/i.test(password) && email.includes("---")) {
    const [realEmail, ...rest] = email.split("---")
    void rest
    if (realEmail.trim()) return { ...acc, email: realEmail.trim() }
  }
  return acc
}

/**
 * Renders one account as a pipe line, omitting segments the product does not
 * provide. Accounts without OAuth tokens render as `email|password` (or just
 * `email`) — never with trailing `|` separators.
 */
export function toPipeLine(acc: CredentialAccount): string {
  const fixed = normalizeAccount(acc)
  const parts = [fixed.email, fixed.password, fixed.refresh_token ?? "", fixed.client_id ?? ""]
  let end = parts.length
  while (end > 1 && !parts[end - 1]) end -= 1
  return parts.slice(0, end).join("|")
}

/**
 * Parses a delivered credentials line. Accepts `email`,
 * `email|password`, or the full `email|password|refresh_token|client_id`
 * form. Returns null when the line carries nothing usable.
 */
export function parsePipeLine(line: string): CredentialAccount | null {
  const parts = line.split("|").map((s) => s.trim())
  if (parts.length !== 1 && parts.length !== 2 && parts.length !== 4) return null
  const [email, password, refresh_token, client_id] = parts
  if (!email) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  if (parts.length === 4 && password && !refresh_token && !client_id) {
    return { email, password }
  }
  return {
    email,
    password: password ?? "",
    refresh_token: refresh_token || undefined,
    client_id: client_id || undefined,
  }
}

function isAccount(value: unknown): value is CredentialAccount {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).email === "string"
  )
}

/**
 * Parses stored delivered-credentials JSON, falling back to the flat
 * delivered_* columns for single-credential orders. Never throws —
 * malformed payloads yield an empty list instead of crashing the table.
 */
export function parseCredentialAccounts(input: {
  deliveredCredentials?: string | null
  deliveredEmail?: string | null
  deliveredPassword?: string | null
  deliveredRefreshToken?: string | null
  deliveredClientId?: string | null
}): CredentialAccount[] {
  let accounts: CredentialAccount[] = []
  if (input.deliveredCredentials) {
    try {
      const parsed: unknown = JSON.parse(input.deliveredCredentials)
      if (Array.isArray(parsed)) accounts = parsed.filter(isAccount).map(normalizeAccount)
    } catch {
      accounts = []
    }
  }
  if (accounts.length === 0 && input.deliveredEmail) {
    accounts = [
      normalizeAccount({
        email: input.deliveredEmail,
        password: input.deliveredPassword ?? "",
        refresh_token: input.deliveredRefreshToken || undefined,
        client_id: input.deliveredClientId || undefined,
      }),
    ]
  }
  return accounts
}

/** Downloads delivered credentials as pipe-delimited lines (one per account). */
export function exportCredentialsTxt(filename: string, accounts: CredentialAccount[]): void {
  const text = accounts.map(toPipeLine).join("\n")
  const blob = new Blob([text], { type: "text/plain;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
